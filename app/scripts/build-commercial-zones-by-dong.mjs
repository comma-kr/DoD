// 인천 + 경기 행정동 단위 상권 폴리곤 빌드 (옵션 B).
// SBA(서울만) 폴리곤에 비서울 행정동 폴리곤을 추가해 zones.geojson 영구 캐시.
//
// 입력:
//   data/admdong-kor/HangJeongDong_ver20260401.geojson  (vuski/admdongkor)
//   data/seoul-commercial-zones/zones.geojson           (SBA 빌드 결과)
//
// 출력:
//   data/seoul-commercial-zones/zones.geojson  (서울 SBA + 인천·경기 행정동 union)
//
// 알고리즘:
//   1. 행정동 GeoJSON 로드 → 인천(sido='28') + 경기(sido='41') 필터
//   2. 각 행정동 centroid → 카카오 FD6(음식점) + CE7(카페) totalCount fetch
//   3. 임계 통과(>= STORE_THRESHOLD) 행정동만 zones에 추가
//      - storeCount >= 200 → 발달상권
//      - storeCount >= 50  → 골목상권
//      - 임계 미만 제외
//   4. 기존 SBA zones와 union → zones.geojson 덮어쓰기
//
// 사용: cd app && node scripts/build-commercial-zones-by-dong.mjs
//   --dry-run   : 카카오 호출 후 통과 카운트만 표시, 파일 안 씀
//   --limit N   : 최대 N개 행정동만 처리 (시범용)
//   --skip-kakao: 카카오 호출 안 하고 더미 카운트로 (스크립트 검증용)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(__dirname, '..');

// .env.local 로드
fs.readFileSync(path.join(APP_ROOT, '.env.local'), 'utf8')
  .split('\n')
  .forEach((line) => {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  });

const KAKAO = process.env.KAKAO_REST_KEY;
if (!KAKAO) {
  console.error('❌ KAKAO_REST_KEY 누락');
  process.exit(1);
}

const ADMDONG_PATH = path.join(APP_ROOT, 'data', 'admdong-kor', 'HangJeongDong_ver20260401.geojson');
const ZONES_PATH = path.join(APP_ROOT, 'data', 'seoul-commercial-zones', 'zones.geojson');

const STORE_THRESHOLD = 0;        // 모든 행정동 시드 (단지 inside 매칭 보장). 표시 임계는 runtime에서 적용.
const SEARCH_RADIUS_M = 500;      // 행정동 centroid 기준 반경
const KAKAO_THROTTLE_MS = 150;    // 호출 간 대기

// ─── CLI ───
const args = process.argv.slice(2);
const flags = {
  dryRun: args.includes('--dry-run'),
  limit: parseInt(args.find((_, i) => args[i - 1] === '--limit') ?? '0', 10) || null,
  skipKakao: args.includes('--skip-kakao'),
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── Geometry centroid (간단 평균) ───
function centroidOf(geom) {
  if (!geom) return null;
  let ring;
  if (geom.type === 'Polygon') ring = geom.coordinates[0];
  else if (geom.type === 'MultiPolygon') ring = geom.coordinates[0][0];
  else return null;
  if (!ring || ring.length === 0) return null;
  const sum = ring.reduce((a, [x, y]) => ({ x: a.x + x, y: a.y + y }), { x: 0, y: 0 });
  return [sum.x / ring.length, sum.y / ring.length];
}

// ─── 카카오 카테고리 totalCount fetch (size=1로 카운트만) ───
async function kakaoCategoryCount(code, lat, lng) {
  const url = new URL('https://dapi.kakao.com/v2/local/search/category.json');
  url.searchParams.set('category_group_code', code);
  url.searchParams.set('x', String(lng));
  url.searchParams.set('y', String(lat));
  url.searchParams.set('radius', String(SEARCH_RADIUS_M));
  url.searchParams.set('size', '1');
  const res = await fetch(url, { headers: { Authorization: `KakaoAK ${KAKAO}` } });
  if (!res.ok) return 0;
  const d = await res.json();
  return d.meta?.total_count ?? 0;
}

// ─── 메인 ───
async function main() {
  console.log('🏗  옵션 B 행정동 단위 상권 폴리곤 빌드');
  console.log('   임계:', STORE_THRESHOLD, '이상 / 검색반경:', SEARCH_RADIUS_M + 'm', '/ throttle:', KAKAO_THROTTLE_MS + 'ms');
  console.log('   ' + (flags.dryRun ? '[dry-run]' : '[write]'),
    flags.limit ? `[limit ${flags.limit}]` : '',
    flags.skipKakao ? '[skip-kakao]' : '');

  // 1. 행정동 GeoJSON 로드 + 인천(28)·경기(41) 필터
  console.log('\n[1] 행정동 GeoJSON 로드…');
  const dongRaw = JSON.parse(fs.readFileSync(ADMDONG_PATH, 'utf8'));
  const targets = dongRaw.features.filter((f) => {
    const sido = f.properties.sido;
    return sido === '28' || sido === '41'; // 인천 + 경기
  });
  console.log(`    인천+경기 행정동: ${targets.length}개`);

  const limited = flags.limit ? targets.slice(0, flags.limit) : targets;

  // 2. 카카오 호출 + 폴리곤 생성
  console.log('\n[2] 각 행정동 카카오 카운트…');
  const newFeatures = [];
  let processed = 0;
  let passed = 0;
  let skipped = 0;
  const startTs = Date.now();

  for (const f of limited) {
    processed++;
    const centroid = centroidOf(f.geometry);
    if (!centroid) {
      console.log(`  ✗ ${f.properties.adm_nm} (centroid 계산 실패)`);
      continue;
    }
    const [lng, lat] = centroid;

    let storeCount = 0;
    if (flags.skipKakao) {
      storeCount = 50; // 더미 카운트
    } else {
      try {
        const fd = await kakaoCategoryCount('FD6', lat, lng);
        await sleep(KAKAO_THROTTLE_MS);
        const ce = await kakaoCategoryCount('CE7', lat, lng);
        storeCount = fd + ce;
      } catch (e) {
        console.log(`  ✗ ${f.properties.adm_nm}: kakao err ${e.message}`);
        await sleep(KAKAO_THROTTLE_MS);
        continue;
      }
      await sleep(KAKAO_THROTTLE_MS);
    }

    if (storeCount < STORE_THRESHOLD) {
      skipped++;
      if (processed % 50 === 0) {
        console.log(`  진행 ${processed}/${limited.length} (통과 ${passed}, skip ${skipped})`);
      }
      continue;
    }

    // seName 분류 — 점포 카운트 기반
    let seName = '골목상권';
    let seCode = 'A';
    if (storeCount >= 200) {
      seName = '발달상권';
      seCode = 'D';
    }

    // 행정동명에서 시도 prefix 제거 ('서울특별시 종로구 사직동' → '종로구 사직동')
    const fullName = f.properties.adm_nm ?? '';
    const shortName = fullName.replace(/^(서울특별시|부산광역시|대구광역시|인천광역시|광주광역시|대전광역시|울산광역시|세종특별자치시|경기도|강원도|강원특별자치도|충청북도|충청남도|전라북도|전북특별자치도|전라남도|경상북도|경상남도|제주특별자치도)\s*/, '');

    newFeatures.push({
      type: 'Feature',
      properties: {
        code: f.properties.adm_cd2 ?? f.properties.adm_cd ?? null,
        name: shortName,
        seCode,
        seName,
        storeCount,
        centroid,
      },
      geometry: f.geometry,
    });
    passed++;

    if (processed % 50 === 0) {
      const elapsed = Math.round((Date.now() - startTs) / 1000);
      console.log(`  진행 ${processed}/${limited.length} (통과 ${passed}, skip ${skipped}, ${elapsed}s)`);
    }
  }

  const elapsed = Math.round((Date.now() - startTs) / 1000);
  console.log(`\n[2 완료] ${processed}개 처리 — 통과 ${passed} / skip ${skipped} (${elapsed}s)`);

  // 3. 기존 SBA zones와 union
  console.log('\n[3] 기존 SBA zones.geojson 로드 + union…');
  let baseZones;
  try {
    baseZones = JSON.parse(fs.readFileSync(ZONES_PATH, 'utf8'));
  } catch {
    console.log('   기존 zones.geojson 없음. 새로 생성.');
    baseZones = { type: 'FeatureCollection', features: [] };
  }
  // 기존 features 중 인천·경기 행정동 키(adm_cd2)는 중복 방지로 제거
  const newCodes = new Set(newFeatures.map((f) => f.properties.code));
  const baseFiltered = baseZones.features.filter((f) => !newCodes.has(f.properties.code));
  const merged = {
    type: 'FeatureCollection',
    features: [...baseFiltered, ...newFeatures],
  };
  console.log(`   SBA features: ${baseFiltered.length}, 신규 행정동: ${newFeatures.length}, 합계: ${merged.features.length}`);

  if (flags.dryRun) {
    console.log('\n✋ dry-run — 파일 쓰지 않음.');
    return;
  }

  // 4. 파일 쓰기
  console.log('\n[4] zones.geojson 덮어쓰기…');
  fs.writeFileSync(ZONES_PATH, JSON.stringify(merged));
  const stats = fs.statSync(ZONES_PATH);
  console.log(`   완료: ${ZONES_PATH} (${(stats.size / 1024 / 1024).toFixed(1)}MB)`);

  console.log('\n🎉 빌드 완료. 운영은 commercial-zones-official.ts loadZones()가 새 zones.geojson 자동 사용.');
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
