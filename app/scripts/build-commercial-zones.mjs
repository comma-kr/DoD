// 서울신용보증재단(SBA) 공식 상권 영역 SHP → WGS84 GeoJSON 변환.
// 한 번만 실행해두면 runtime에서 가벼운 GeoJSON 1개만 로드하면 됨.
//
// 입력: data/seoul-commercial-zones/서울시 상권분석서비스(영역-상권).{shp,dbf,prj,...}
// 출력: data/seoul-commercial-zones/zones.geojson (WGS84)
//
// 사용:
//   node scripts/build-commercial-zones.mjs

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFile, readFile, readdir } from 'node:fs/promises';
import * as shapefile from 'shapefile';
import proj4 from 'proj4';
import iconv from 'iconv-lite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(APP_ROOT, 'data', 'seoul-commercial-zones');
const SHP_BASE = path.join(DATA_DIR, '서울시 상권분석서비스(영역-상권)');
const OUT_PATH = path.join(DATA_DIR, 'zones.geojson');

// EPSG:5181 (Korea 2000 Korea Central Belt) → EPSG:4326 (WGS84)
const EPSG_5181 =
  '+proj=tmerc +lat_0=38 +lon_0=127 +k=1 +x_0=200000 +y_0=500000 +ellps=GRS80 +units=m +no_defs';
const EPSG_4326 = '+proj=longlat +datum=WGS84 +no_defs';

function reprojectRing(ring) {
  return ring.map(([x, y]) => proj4(EPSG_5181, EPSG_4326, [x, y]));
}

function reprojectGeometry(geom) {
  if (!geom) return null;
  if (geom.type === 'Polygon') {
    return { type: 'Polygon', coordinates: geom.coordinates.map(reprojectRing) };
  }
  if (geom.type === 'MultiPolygon') {
    return {
      type: 'MultiPolygon',
      coordinates: geom.coordinates.map((poly) => poly.map(reprojectRing)),
    };
  }
  return null;
}

// 폴리곤 centroid (간단 평균) — runtime에서 inclusion 체크 시 1차 필터용
function centroidOfGeometry(geom) {
  const ring =
    geom.type === 'Polygon'
      ? geom.coordinates[0]
      : geom.type === 'MultiPolygon'
      ? geom.coordinates[0][0]
      : [];
  if (ring.length === 0) return null;
  const sum = ring.reduce((acc, [x, y]) => ({ x: acc.x + x, y: acc.y + y }), { x: 0, y: 0 });
  return [sum.x / ring.length, sum.y / ring.length];
}

// 같은 폴더의 (아파트-상권) JSON에서 trdar_cd → 한글 이름 매핑 추출.
// SHP의 dbf가 cp949라 텍스트 폴리필이 깨지지만 JSON은 utf-8이므로 정상.
async function loadCodeNameMap() {
  const jsonPath = path.join(DATA_DIR, '서울시 상권분석서비스(아파트-상권).json');
  console.log('JSON 매핑 읽기:', jsonPath);
  const raw = await readFile(jsonPath, 'utf8');
  const obj = JSON.parse(raw);
  const map = new Map();
  for (const row of obj.DATA ?? []) {
    const code = row.trdar_cd ? String(row.trdar_cd) : null;
    if (!code) continue;
    if (map.has(code)) continue;
    map.set(code, {
      name: row.trdar_cd_nm ?? null,
      seName: row.trdar_se_cd_nm ?? null,
      seCode: row.trdar_se_cd ?? null,
    });
  }
  console.log(`  → ${map.size}개 코드 매핑 확보`);
  return map;
}

// CSV 한 줄을 따옴표·콤마 안전하게 파싱
function parseCsvLine(line) {
  const cells = [];
  let buf = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { buf += '"'; i++; }
      else inQuote = !inQuote;
    } else if (ch === ',' && !inQuote) {
      cells.push(buf); buf = '';
    } else buf += ch;
  }
  cells.push(buf);
  return cells;
}

// (점포-상권) 데이터: JSON 또는 CSV 둘 다 지원. cp949 CSV 디코딩.
// trdar_cd × 가장 최신 분기 → 모든 업종 점포 수 합산.
async function loadStoreCountMap() {
  const files = await readdir(DATA_DIR);
  const storeFile = files.find((f) => /점포[-_]상권/.test(f));
  if (!storeFile) {
    console.log('점포-상권 파일 없음 → storeCount 생략 (라벨에 점포 수 표시 안 됨)');
    return new Map();
  }
  const fpath = path.join(DATA_DIR, storeFile);
  console.log('점포 매핑 읽기:', storeFile);

  const byCode = new Map(); // code → { quarter, total }

  if (storeFile.endsWith('.json')) {
    const raw = await readFile(fpath, 'utf8');
    const obj = JSON.parse(raw);
    for (const row of obj.DATA ?? []) {
      const code = row.trdar_cd ? String(row.trdar_cd) : null;
      const qtr = row.stdr_yyqu_cd ? String(row.stdr_yyqu_cd) : '';
      const stor = parseInt(row.stor_co, 10);
      if (!code || isNaN(stor)) continue;
      const cur = byCode.get(code);
      if (!cur || qtr > cur.quarter) byCode.set(code, { quarter: qtr, total: stor });
      else if (qtr === cur.quarter) cur.total += stor;
    }
  } else {
    // CSV (cp949)
    const buf = await readFile(fpath);
    const text = iconv.decode(buf, 'cp949');
    const lines = text.split(/\r?\n/);
    if (lines.length < 2) throw new Error('CSV가 비어있음');

    // 헤더 파싱 → 한글 칼럼명에서 인덱스 찾기
    const headers = parseCsvLine(lines[0]);
    const idxQtr = headers.findIndex((h) => h.includes('기준_년분기'));
    const idxCode = headers.findIndex((h) => h === '상권_코드');
    const idxStor = headers.findIndex((h) => h === '점포_수');
    if (idxQtr < 0 || idxCode < 0 || idxStor < 0) {
      throw new Error(`CSV 헤더 매핑 실패: qtr=${idxQtr}, code=${idxCode}, stor=${idxStor} / headers=${headers.join('|')}`);
    }

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      const cells = parseCsvLine(line);
      const code = cells[idxCode];
      const qtr = cells[idxQtr];
      const stor = parseInt(cells[idxStor], 10);
      if (!code || isNaN(stor)) continue;
      const cur = byCode.get(code);
      if (!cur || qtr > cur.quarter) byCode.set(code, { quarter: qtr, total: stor });
      else if (qtr === cur.quarter) cur.total += stor;
    }
  }

  const flat = new Map();
  for (const [code, v] of byCode.entries()) flat.set(code, v.total);
  // 분기 분포 확인 (디버그)
  const quarters = [...new Set([...byCode.values()].map((v) => v.quarter))].sort();
  console.log(`  → ${flat.size}개 상권 / 사용 분기: ${quarters.join(', ')}`);
  return flat;
}

async function main() {
  const codeMap = await loadCodeNameMap();
  const storeMap = await loadStoreCountMap();
  console.log('SHP 읽기:', SHP_BASE);
  // .cpg 파일은 cp949지만 text-encoding 폴리필이 미지원 → euc-kr alias 시도.
  // 실패 시 utf-8 fallback (props 한글 깨짐. code만 활용하면 OK).
  let source;
  try {
    source = await shapefile.open(`${SHP_BASE}.shp`, `${SHP_BASE}.dbf`, {
      encoding: 'euc-kr',
    });
  } catch {
    console.warn('  euc-kr 로드 실패 → utf-8 fallback (한글 props 깨질 수 있음)');
    source = await shapefile.open(`${SHP_BASE}.shp`, `${SHP_BASE}.dbf`);
  }

  const features = [];
  let n = 0;
  while (true) {
    const { done, value } = await source.read();
    if (done) break;
    n++;

    const projected = reprojectGeometry(value.geometry);
    if (!projected) continue;
    const centroid = centroidOfGeometry(projected);

    const props = value.properties ?? {};
    // 코드는 숫자라 cp949 깨짐 영향 없음
    const code =
      props.TRDAR_CD ?? props.trdar_cd ?? props.TR_CODE ?? null;
    const codeStr = code != null ? String(code) : null;

    // JSON 매핑에서 한글 이름·구분 가져오기 (SHP dbf의 깨진 한글 무시)
    const fromMap = codeStr ? codeMap.get(codeStr) : null;

    features.push({
      type: 'Feature',
      properties: {
        code: codeStr,
        name: fromMap?.name ?? null,
        seCode: fromMap?.seCode != null ? String(fromMap.seCode) : null,
        seName: fromMap?.seName ?? null,
        storeCount: codeStr ? storeMap.get(codeStr) ?? null : null,
        centroid, // [lng, lat]
      },
      geometry: projected,
    });
  }

  const geojson = {
    type: 'FeatureCollection',
    crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:EPSG::4326' } },
    note: '서울신용보증재단(SBA) · 서울시 상권분석서비스(영역-상권). 공공누리 1유형.',
    features,
  };

  await writeFile(OUT_PATH, JSON.stringify(geojson));
  console.log(`✓ ${n}개 feature → ${features.length}개 변환 완료`);
  console.log(`  출력: ${OUT_PATH}`);

  // 첫 5개 sample 출력
  console.log('\n샘플 5개:');
  for (const f of features.slice(0, 5)) {
    const p = f.properties;
    console.log(`  [${p.seName}] ${p.name} (${p.code}) · centroid ${p.centroid?.map((v) => v.toFixed(4)).join(',')}`);
  }

  // 상권 종류별 카운트
  const seCount = new Map();
  for (const f of features) {
    const k = f.properties.seName ?? '(미분류)';
    seCount.set(k, (seCount.get(k) ?? 0) + 1);
  }
  console.log('\n상권 종류별:');
  for (const [k, v] of seCount.entries()) {
    console.log(`  ${k}: ${v}`);
  }
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
