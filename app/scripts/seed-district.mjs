// 법정동코드로 단지를 K-Apt API에서 가져와 DB에 적재하는 generic 스크립트.
// 기존 데이터를 유지하면서 새 권역을 추가한다 (upsert by name+address).
//
// 사용법:
//   node scripts/seed-district.mjs                    ← 기본 권역 전체
//   node scripts/seed-district.mjs 1171010800         ← 특정 법정동코드만
//   node scripts/seed-district.mjs --list             ← 등록된 권역 목록 보기

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '.env.local');
fs.readFileSync(envPath, 'utf8')
  .split('\n')
  .forEach((line) => {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) process.env[m[1]] = m[2];
  });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const KEY_RAW = process.env.KAPT_API_KEY || process.env.PUBLIC_DATA_API_KEY;
const KEY = KEY_RAW.includes('%') ? decodeURIComponent(KEY_RAW) : KEY_RAW;
const KAKAO_REST_KEY = process.env.KAKAO_REST_KEY;

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const BASE = 'https://apis.data.go.kr/1613000';

// ============================================================
// 핵심 권역 법정동코드 (서울 주요 입지)
// ============================================================
const DISTRICTS = {
  여의도동: '1156011000',
  잠실동: '1171010800',
  신천동: '1171010700',
  가락동: '1171010300',
  대치동: '1168010600',
  반포동: '1165010800',
  서초동: '1165010100',
  아현동: '1144010300',
  목동: '1147010100',
  성수동1가: '1120010100',
  압구정동: '1168010100',
};

// ============================================================
// K-Apt API 호출
// ============================================================
async function fetchKaptList(bjdCode, pageNo = 1, numOfRows = 200) {
  const url = new URL(`${BASE}/AptListService3/getLegaldongAptList3`);
  url.searchParams.set('serviceKey', KEY);
  url.searchParams.set('bjdCode', bjdCode);
  url.searchParams.set('pageNo', String(pageNo));
  url.searchParams.set('numOfRows', String(numOfRows));
  url.searchParams.set('_type', 'json');
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`KAPT list HTTP ${res.status}`);
  const data = await res.json();
  const items = data.response?.body?.items;
  if (!items || items === '') return [];
  return Array.isArray(items) ? items : [items];
}

async function fetchKaptBasis(kaptCode) {
  const url = new URL(`${BASE}/AptBasisInfoServiceV4/getAphusBassInfoV4`);
  url.searchParams.set('serviceKey', KEY);
  url.searchParams.set('kaptCode', kaptCode);
  url.searchParams.set('_type', 'json');
  const res = await fetch(url.toString());
  if (!res.ok) return null;
  const data = await res.json();
  return data.response?.body?.item ?? null;
}

// ============================================================
// 카카오 지오코딩 + 역 매핑
// ============================================================
async function geocode(address) {
  if (!KAKAO_REST_KEY) return null;
  const url = new URL('https://dapi.kakao.com/v2/local/search/address.json');
  url.searchParams.set('query', address);
  const res = await fetch(url.toString(), {
    headers: { Authorization: `KakaoAK ${KAKAO_REST_KEY}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  const doc = data.documents?.[0];
  if (!doc) return null;
  return { lat: parseFloat(doc.y), lng: parseFloat(doc.x) };
}

async function findNearestStation(lat, lng) {
  if (!KAKAO_REST_KEY) return null;
  const url = new URL('https://dapi.kakao.com/v2/local/search/category.json');
  url.searchParams.set('category_group_code', 'SW8');
  url.searchParams.set('x', String(lng));
  url.searchParams.set('y', String(lat));
  url.searchParams.set('radius', '1500');
  url.searchParams.set('sort', 'distance');
  url.searchParams.set('size', '1');
  const res = await fetch(url.toString(), {
    headers: { Authorization: `KakaoAK ${KAKAO_REST_KEY}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  const top = data.documents?.[0];
  if (!top) return null;
  return {
    name: top.place_name,
    distance: parseInt(top.distance, 10) || null,
  };
}

function parseUseDateYear(s) {
  if (!s || s.length < 4) return null;
  const y = parseInt(s.slice(0, 4), 10);
  return isNaN(y) ? null : y;
}

// ============================================================
// 메인: 단일 법정동 적재
// ============================================================
async function seedOneDong(dongName, bjdCode) {
  console.log(`\n📍 ${dongName} (${bjdCode})`);

  // 1. K-Apt 목록
  const list = await fetchKaptList(bjdCode);
  console.log(`   K-Apt: ${list.length}개 단지`);
  if (list.length === 0) return { success: 0, skip: 0, fail: 0 };

  let success = 0, skip = 0, fail = 0;

  for (const apt of list) {
    // 이미 존재하는지 체크 (kaptCode 기준)
    const { data: existing } = await sb
      .from('apartments')
      .select('id')
      .eq('raw_data->>kaptCode', apt.kaptCode)
      .maybeSingle();

    if (existing) {
      skip++;
      continue; // 이미 적재됨
    }

    // 2. 기본정보
    const basis = await fetchKaptBasis(apt.kaptCode);
    if (!basis) { fail++; continue; }

    const builtYear = parseUseDateYear(basis.kaptUsedate);
    const totalUnits = basis.kaptdaCnt ? Math.floor(basis.kaptdaCnt) : null;

    // 3. 지오코딩
    const coord = basis.doroJuso ? await geocode(basis.doroJuso) : null;
    await new Promise((r) => setTimeout(r, 100));

    // 4. 가까운 역
    let station = null;
    if (coord) {
      station = await findNearestStation(coord.lat, coord.lng);
      await new Promise((r) => setTimeout(r, 100));
    }

    // 5. DB 적재
    const { error } = await sb.from('apartments').insert({
      name: basis.kaptName ?? apt.kaptName,
      address: basis.kaptAddr ?? `${apt.as1} ${apt.as2} ${apt.as3}`,
      dong_code: basis.bjdCode ?? bjdCode,
      total_units: totalUnits,
      built_year: builtYear,
      nearest_station: station?.name ?? null,
      station_distance_m: station?.distance ?? null,
      latitude: coord?.lat ?? null,
      longitude: coord?.lng ?? null,
      raw_data: {
        kaptCode: basis.kaptCode,
        doroJuso: basis.doroJuso,
        codeAptNm: basis.codeAptNm,
        codeHeatNm: basis.codeHeatNm,
        kaptDongCnt: basis.kaptDongCnt,
        kaptTopFloor: basis.kaptTopFloor,
        kaptTarea: basis.kaptTarea,
        kaptMarea: basis.kaptMarea,
        kaptBcompany: basis.kaptBcompany,
        zipcode: basis.zipcode,
      },
    });

    if (error) {
      fail++;
    } else {
      success++;
      process.stdout.write(`   ✓ ${basis.kaptName} (${totalUnits ?? '?'}세대)\n`);
    }

    await new Promise((r) => setTimeout(r, 150)); // API rate limit
  }

  console.log(`   → 신규 ${success}, 스킵 ${skip}, 실패 ${fail}`);
  return { success, skip, fail };
}

// ============================================================
// 실거래가 적재 (단지별로 매칭)
// ============================================================
function normalizeAptName(name) {
  let n = name;
  n = n.replace(/\((.*?)\)/g, ' $1 ');
  const romanMap = { Ⅰ: '1', Ⅱ: '2', Ⅲ: '3', I: '1', II: '2', III: '3' };
  for (const [from, to] of Object.entries(romanMap)) {
    n = n.replace(new RegExp(from, 'g'), to);
  }
  n = n.replace(/[0-9]+차/g, (m) => m.replace('차', ''));
  n = n.replace(/\s+/g, '').replace(/[·.,_-]/g, '');
  n = n.replace(/아파트$/, '');
  return n.toLowerCase();
}

function parseTradeXml(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = itemRegex.exec(xml)) !== null) {
    const obj = {};
    const fieldRegex = /<(\w+)>([^<]*)<\/\1>/g;
    let f;
    while ((f = fieldRegex.exec(m[1])) !== null) {
      obj[f[1]] = f[2].trim();
    }
    items.push(obj);
  }
  return items;
}

async function seedTradesForSgg(sggCode, months = 12) {
  console.log(`\n📈 실거래가: 시군구 ${sggCode}`);

  // 해당 시군구의 모든 단지를 dong_code 앞 5자리로 필터
  const { data: apts } = await sb
    .from('apartments')
    .select('id, name, dong_code')
    .like('dong_code', `${sggCode}%`);

  if (!apts || apts.length === 0) {
    console.log('   해당 시군구에 적재된 단지 없음');
    return;
  }

  console.log(`   DB 단지: ${apts.length}개`);

  // 단지명 → ID 매핑 (정규화 + 접두어 제거)
  const nameMap = new Map();
  const PREFIXES = /^여의도?|^잠실|^대치|^반포|^서초|^마포|^목동|^성수|^압구정|^문정|^가락|^신천|^올림픽/;
  for (const apt of apts) {
    const norm = normalizeAptName(apt.name);
    nameMap.set(norm, apt.id);
    const stripped = norm.replace(PREFIXES, '');
    if (stripped.length >= 2 && !nameMap.has(stripped)) {
      nameMap.set(stripped, apt.id);
    }
  }

  function matchApt(apiName) {
    const norm = normalizeAptName(apiName);
    if (nameMap.has(norm)) return nameMap.get(norm);
    const stripped = norm.replace(PREFIXES, '');
    if (stripped.length >= 2 && nameMap.has(stripped)) return nameMap.get(stripped);
    for (const [dbNorm, id] of nameMap.entries()) {
      if (dbNorm.length >= 2 && (norm.includes(dbNorm) || dbNorm.includes(norm))) return id;
    }
    return null;
  }

  // 이 시군구에 속하는 동 이름들 수집 (실거래가 umdNm 필터용)
  const dongNames = new Set();
  for (const apt of apts) {
    // 주소에서 동 이름 추출: "서울특별시 송파구 문정동 104" → "문정동"
    const dongMatch = apt.name ? null : null; // 주소에서 추출
  }
  // 동 필터 없이 전체 시군구 거래를 가져와서 단지명으로만 매칭
  // (umdNm 필터 제거 — 동 이름 불일치 문제 해결)

  const now = new Date();
  let totalInserted = 0;
  let totalMatched = 0;
  for (let i = 1; i <= months; i++) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - i);
    const ym = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;

    // 페이지네이션 (시군구 전체라 한 달에 수백건 가능)
    let allItems = [];
    let pageNo = 1;
    while (true) {
      const url = new URL('https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade');
      url.searchParams.set('serviceKey', KEY);
      url.searchParams.set('LAWD_CD', sggCode);
      url.searchParams.set('DEAL_YMD', ym);
      url.searchParams.set('numOfRows', '500');
      url.searchParams.set('pageNo', String(pageNo));

      const res = await fetch(url.toString());
      if (!res.ok) break;
      const xml = await res.text();
      const items = parseTradeXml(xml);
      allItems = allItems.concat(items);
      if (items.length < 500) break;
      pageNo++;
      await new Promise((r) => setTimeout(r, 200));
    }

    // umdNm 필터 없이 단지명 매칭만으로 필터
    const inserts = [];
    for (const it of allItems) {
      const aptId = matchApt(it.aptNm);
      if (!aptId) continue;

      const dealDate = `${it.dealYear}-${String(it.dealMonth).padStart(2, '0')}-${String(it.dealDay).padStart(2, '0')}`;
      const price10k = parseInt(it.dealAmount.replace(/,/g, ''), 10);
      const areaM2 = parseFloat(it.excluUseAr);
      const floor = parseInt(it.floor, 10);
      if (isNaN(price10k) || isNaN(areaM2)) continue;

      inserts.push({
        apartment_id: aptId,
        deal_date: dealDate,
        area_m2: areaM2,
        price_10k: price10k,
        floor: isNaN(floor) ? null : floor,
      });
    }

    if (inserts.length > 0) {
      const { error } = await sb.from('trade_history').insert(inserts);
      if (!error) totalInserted += inserts.length;
    }

    totalMatched += inserts.length;
    process.stdout.write(`   ${ym}: 시군구 ${allItems.length}건 → 매칭 ${inserts.length}건\n`);
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`   → 총 ${totalInserted}건 적재`);
}

// ============================================================
// 법정동코드 → 시군구 코드 (앞 5자리)
// ============================================================
function getSggCode(bjdCode) {
  return bjdCode.slice(0, 5);
}

// 법정동코드 → 동 이름 (DISTRICTS 역방향)
function getDongName(bjdCode) {
  for (const [name, code] of Object.entries(DISTRICTS)) {
    if (code === bjdCode) return name;
  }
  return null;
}

// ============================================================
// 진입점
// ============================================================
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--list')) {
    console.log('등록된 권역:');
    for (const [name, code] of Object.entries(DISTRICTS)) {
      console.log(`  ${name.padEnd(12)} ${code}`);
    }
    return;
  }

  // 특정 코드만 지정하면 그것만, 아니면 전체
  const targetCodes = args.length > 0
    ? args.filter((a) => /^\d+$/.test(a))
    : Object.values(DISTRICTS);

  const targetNames = args.length > 0
    ? args.filter((a) => /^\d+$/.test(a)).map((c) => getDongName(c) ?? c)
    : Object.keys(DISTRICTS);

  console.log(`\n=== 단지 시드 확장: ${targetNames.join(', ')} ===`);
  console.log(`총 ${targetCodes.length}개 법정동\n`);

  let totalSuccess = 0, totalSkip = 0, totalFail = 0;

  for (let i = 0; i < targetCodes.length; i++) {
    const bjdCode = targetCodes[i];
    const dongName = targetNames[i];
    const { success, skip, fail } = await seedOneDong(dongName, bjdCode);
    totalSuccess += success;
    totalSkip += skip;
    totalFail += fail;
  }

  console.log(`\n=== 단지 적재 완료 ===`);
  console.log(`신규: ${totalSuccess}, 스킵(기존): ${totalSkip}, 실패: ${totalFail}`);

  // 실거래가도 같이 적재 (시군구 단위, 중복 방지)
  console.log(`\n=== 실거래가 적재 시작 ===`);

  const processedSgg = new Set();
  for (let i = 0; i < targetCodes.length; i++) {
    const sggCode = getSggCode(targetCodes[i]);
    if (processedSgg.has(sggCode)) {
      console.log(`\n📈 시군구 ${sggCode}: 이미 처리됨 (스킵)`);
      continue;
    }
    processedSgg.add(sggCode);
    await seedTradesForSgg(sggCode, 12);
  }

  // 최종 통계
  const { count: aptCount } = await sb.from('apartments').select('*', { count: 'exact', head: true });
  const { count: tradeCount } = await sb.from('trade_history').select('*', { count: 'exact', head: true });
  console.log(`\n=== 최종 DB 현황 ===`);
  console.log(`총 단지: ${aptCount}개`);
  console.log(`총 거래: ${tradeCount}건`);
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
