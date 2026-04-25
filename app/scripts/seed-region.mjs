// 시군구 단위 통합 시드: 단지 마스터 + 매매 + 전월세 한 번에.
// K-Apt getSigunguAptList3 호출로 동 코드 매핑 없이 구 전체 단지 적재.
//
// 사용법:
//   node scripts/seed-region.mjs 11200             ← 성동구
//   node scripts/seed-region.mjs 11440 11560 11200 ← 여러 구
//
// 시군구 코드:
//   11200 성동구 / 11440 마포구 / 11560 영등포구

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

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const KEY_RAW = process.env.KAPT_API_KEY || process.env.PUBLIC_DATA_API_KEY;
const KEY = KEY_RAW.includes('%') ? decodeURIComponent(KEY_RAW) : KEY_RAW;
const KAKAO_REST_KEY = process.env.KAKAO_REST_KEY;

const KAPT_BASE = 'https://apis.data.go.kr/1613000';
const SGG_NAMES = {
  '11200': '성동구',
  '11440': '마포구',
  '11560': '영등포구',
};

// ============================================================
// K-Apt — 시군구 단위 단지 목록
// ============================================================
async function fetchSigunguAptList(sigunguCode, pageNo = 1, numOfRows = 200) {
  const url = new URL(`${KAPT_BASE}/AptListService3/getSigunguAptList3`);
  url.searchParams.set('serviceKey', KEY);
  url.searchParams.set('sigunguCode', sigunguCode);
  url.searchParams.set('pageNo', String(pageNo));
  url.searchParams.set('numOfRows', String(numOfRows));
  url.searchParams.set('_type', 'json');
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`K-Apt sigungu HTTP ${res.status}`);
  const data = await res.json();
  const items = data.response?.body?.items;
  if (!items || items === '') return [];
  if (Array.isArray(items)) return items;
  if (typeof items === 'object' && 'item' in items) {
    return Array.isArray(items.item) ? items.item : [items.item];
  }
  return [items];
}

async function fetchAllSigunguApts(sigunguCode) {
  const all = [];
  let pageNo = 1;
  while (true) {
    const items = await fetchSigunguAptList(sigunguCode, pageNo, 200);
    if (items.length === 0) break;
    all.push(...items);
    if (items.length < 200) break;
    pageNo++;
    await new Promise((r) => setTimeout(r, 200));
  }
  return all;
}

async function fetchKaptBasis(kaptCode) {
  const url = new URL(`${KAPT_BASE}/AptBasisInfoServiceV4/getAphusBassInfoV4`);
  url.searchParams.set('serviceKey', KEY);
  url.searchParams.set('kaptCode', kaptCode);
  url.searchParams.set('_type', 'json');
  const res = await fetch(url.toString());
  if (!res.ok) return null;
  const data = await res.json();
  return data.response?.body?.item ?? null;
}

// ============================================================
// 카카오 지오코딩 + 역
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
// 단지 시드
// ============================================================
async function seedAptsForSigungu(sigunguCode) {
  const sggName = SGG_NAMES[sigunguCode] ?? sigunguCode;
  console.log(`\n📍 ${sggName} (${sigunguCode}) — K-Apt 단지 목록 호출`);
  const list = await fetchAllSigunguApts(sigunguCode);
  console.log(`   ${list.length}개 단지`);

  let success = 0,
    skip = 0,
    fail = 0;

  for (let i = 0; i < list.length; i++) {
    const apt = list[i];
    if (!apt.kaptCode) {
      fail++;
      continue;
    }

    // 중복 방지: kaptCode 기준
    const { data: existing } = await sb
      .from('apartments')
      .select('id')
      .eq('raw_data->>kaptCode', apt.kaptCode)
      .maybeSingle();
    if (existing) {
      skip++;
      continue;
    }

    const basis = await fetchKaptBasis(apt.kaptCode);
    if (!basis) {
      fail++;
      await new Promise((r) => setTimeout(r, 100));
      continue;
    }

    const builtYear = parseUseDateYear(basis.kaptUsedate);
    const totalUnits = basis.kaptdaCnt ? Math.floor(basis.kaptdaCnt) : null;

    const coord = basis.doroJuso ? await geocode(basis.doroJuso) : null;
    await new Promise((r) => setTimeout(r, 100));

    let station = null;
    if (coord) {
      station = await findNearestStation(coord.lat, coord.lng);
      await new Promise((r) => setTimeout(r, 100));
    }

    const { error } = await sb.from('apartments').insert({
      name: basis.kaptName ?? apt.kaptName,
      address: basis.kaptAddr ?? `${apt.as1 ?? ''} ${apt.as2 ?? ''} ${apt.as3 ?? ''}`.trim(),
      dong_code: basis.bjdCode ?? apt.bjdCode ?? null,
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
        codeSaleNm: basis.codeSaleNm,
        codeHeatNm: basis.codeHeatNm,
        kaptDongCnt: basis.kaptDongCnt,
        kaptTopFloor: basis.kaptTopFloor,
        kaptTarea: basis.kaptTarea,
        kaptMarea: basis.kaptMarea,
        kaptBcompany: basis.kaptBcompany,
        zipcode: basis.zipcode,
        bjdCode: basis.bjdCode,
      },
    });

    if (error) {
      fail++;
    } else {
      success++;
      if (i % 20 === 0 || success <= 5) {
        process.stdout.write(`   [${i + 1}/${list.length}] ✓ ${basis.kaptName} (${totalUnits ?? '?'})\n`);
      }
    }

    await new Promise((r) => setTimeout(r, 100));
  }

  console.log(`   → 신규 ${success} · 스킵 ${skip} · 실패 ${fail}`);
  return { success, skip, fail };
}

// ============================================================
// 단지명 정규화 (매매·전월세 매칭용)
// ============================================================
const ROMAN_MAP = {
  Ⅰ: '1', Ⅱ: '2', Ⅲ: '3', Ⅳ: '4', Ⅴ: '5',
  I: '1', II: '2', III: '3', IV: '4', V: '5',
};

function normalize(name) {
  let n = name;
  n = n.replace(/\((.*?)\)/g, ' $1 ');
  for (const [from, to] of Object.entries(ROMAN_MAP)) {
    n = n.replace(new RegExp(from, 'g'), to);
  }
  n = n.replace(/[0-9]+차/g, (m) => m.replace('차', ''));
  n = n.replace(/\s+/g, '').replace(/[·.,_-]/g, '');
  n = n.replace(/아파트$/, '').replace(/주상복합$/, '');
  return n.toLowerCase();
}

// 단지 nameMap 생성 (시군구 단위)
async function buildNameMap(sigunguCode) {
  const { data: apts } = await sb
    .from('apartments')
    .select('id, name, dong_code')
    .like('dong_code', `${sigunguCode}%`);

  if (!apts || apts.length === 0) return { nameMap: new Map(), apts: [] };

  const nameMap = new Map();
  for (const apt of apts) {
    const norm = normalize(apt.name);
    nameMap.set(norm, apt.id);
    // 권역 접두어 제거 버전 (여의도, 잠실, 마포, 성수 등)
    const stripped = norm.replace(/^(여의도?|잠실|대치|반포|서초|마포|목동|성수|압구정|문정|가락|신천|올림픽|한남|성수|상수|망원|연남|공덕|왕십리|행당|옥수|영등포|당산|문래|신길|대흥|아현|용강)/, '');
    if (stripped.length >= 2 && !nameMap.has(stripped)) {
      nameMap.set(stripped, apt.id);
    }
  }
  return { nameMap, apts };
}

function matchApt(apiName, nameMap) {
  const norm = normalize(apiName);
  if (nameMap.has(norm)) return nameMap.get(norm);
  const stripped = norm.replace(/^(여의도?|잠실|대치|반포|서초|마포|목동|성수|압구정|문정|가락|신천|올림픽|한남|성수|상수|망원|연남|공덕|왕십리|행당|옥수|영등포|당산|문래|신길|대흥|아현|용강)/, '');
  if (stripped.length >= 2 && nameMap.has(stripped)) return nameMap.get(stripped);
  for (const [dbNorm, id] of nameMap.entries()) {
    if (dbNorm.length >= 3 && (norm.includes(dbNorm) || dbNorm.includes(norm))) return id;
  }
  return null;
}

// ============================================================
// XML 파서
// ============================================================
function parseRtmsXml(xml) {
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

function getRecentMonths(count = 12) {
  const months = [];
  const now = new Date(2026, 3, 1);
  for (let i = 1; i <= count; i++) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - i);
    const ym = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
    months.push(ym);
  }
  return months.reverse();
}

// ============================================================
// 매매 시드
// ============================================================
async function seedTradesForSigungu(sigunguCode, nameMap) {
  console.log(`\n📈 ${SGG_NAMES[sigunguCode]} 매매 12개월`);

  // 기존 시군구 거래 삭제 (재시드)
  const aptIds = [...new Set(nameMap.values())];
  if (aptIds.length > 0) {
    await sb.from('trade_history').delete().in('apartment_id', aptIds);
  }

  const months = getRecentMonths(12);
  let totalInserted = 0;

  for (const ym of months) {
    let allItems = [];
    let pageNo = 1;
    while (true) {
      const url = new URL(
        'https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade'
      );
      url.searchParams.set('serviceKey', KEY);
      url.searchParams.set('LAWD_CD', sigunguCode);
      url.searchParams.set('DEAL_YMD', ym);
      url.searchParams.set('numOfRows', '500');
      url.searchParams.set('pageNo', String(pageNo));

      const res = await fetch(url.toString());
      if (!res.ok) break;
      const items = parseRtmsXml(await res.text());
      allItems = allItems.concat(items);
      if (items.length < 500) break;
      pageNo++;
      await new Promise((r) => setTimeout(r, 200));
    }

    const inserts = [];
    for (const it of allItems) {
      const aptId = matchApt(it.aptNm, nameMap);
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
        deal_type: it.dealingGbn ?? null,
      });
    }

    if (inserts.length > 0) {
      const { error } = await sb.from('trade_history').insert(inserts);
      if (!error) totalInserted += inserts.length;
    }
    process.stdout.write(`   ${ym}: 시군구 ${allItems.length}건 → 매칭 ${inserts.length}건\n`);
    await new Promise((r) => setTimeout(r, 250));
  }

  console.log(`   → 매매 총 ${totalInserted}건 적재`);
  return totalInserted;
}

// ============================================================
// 전월세 시드
// ============================================================
async function seedRentsForSigungu(sigunguCode, nameMap) {
  console.log(`\n🏠 ${SGG_NAMES[sigunguCode]} 전월세 12개월`);

  const aptIds = [...new Set(nameMap.values())];
  if (aptIds.length > 0) {
    await sb.from('rent_history').delete().in('apartment_id', aptIds);
  }

  const months = getRecentMonths(12);
  let totalInserted = 0;

  for (const ym of months) {
    let allItems = [];
    let pageNo = 1;
    while (true) {
      const url = new URL(
        'https://apis.data.go.kr/1613000/RTMSDataSvcAptRent/getRTMSDataSvcAptRent'
      );
      url.searchParams.set('serviceKey', KEY);
      url.searchParams.set('LAWD_CD', sigunguCode);
      url.searchParams.set('DEAL_YMD', ym);
      url.searchParams.set('numOfRows', '500');
      url.searchParams.set('pageNo', String(pageNo));

      const res = await fetch(url.toString());
      if (!res.ok) break;
      const items = parseRtmsXml(await res.text());
      allItems = allItems.concat(items);
      if (items.length < 500) break;
      pageNo++;
      await new Promise((r) => setTimeout(r, 200));
    }

    const inserts = [];
    for (const it of allItems) {
      const aptId = matchApt(it.aptNm, nameMap);
      if (!aptId) continue;
      const dealDate = `${it.dealYear}-${String(it.dealMonth).padStart(2, '0')}-${String(it.dealDay).padStart(2, '0')}`;
      const deposit10k = parseInt((it.deposit ?? '0').replace(/,/g, ''), 10);
      const monthly10k = parseInt((it.monthlyRent ?? '0').replace(/,/g, ''), 10) || 0;
      const areaM2 = parseFloat(it.excluUseAr);
      const floor = parseInt(it.floor, 10);
      if (isNaN(deposit10k) || isNaN(areaM2)) continue;
      inserts.push({
        apartment_id: aptId,
        deal_date: dealDate,
        area_m2: areaM2,
        deposit_10k: deposit10k,
        monthly_rent_10k: monthly10k,
        floor: isNaN(floor) ? null : floor,
        contract_type: monthly10k > 0 ? '월세' : '전세',
        deal_type: it.dealingGbn ?? null,
        raw_contract_type: it.contractType ?? null,
      });
    }

    if (inserts.length > 0) {
      const { error } = await sb.from('rent_history').insert(inserts);
      if (!error) totalInserted += inserts.length;
    }
    process.stdout.write(`   ${ym}: 시군구 ${allItems.length}건 → 매칭 ${inserts.length}건\n`);
    await new Promise((r) => setTimeout(r, 250));
  }

  console.log(`   → 전월세 총 ${totalInserted}건 적재`);
  return totalInserted;
}

// ============================================================
// 메인
// ============================================================
async function main() {
  const args = process.argv.slice(2).filter((a) => /^\d{5}$/.test(a));
  if (args.length === 0) {
    console.log('사용법: node scripts/seed-region.mjs <시군구코드 5자리> ...');
    console.log('예: node scripts/seed-region.mjs 11200 11440 11560');
    return;
  }

  const startedAt = Date.now();
  console.log(`\n=== seed-region 시작: ${args.map((c) => SGG_NAMES[c] ?? c).join(', ')} ===`);

  // 1단계: 단지 마스터
  for (const sgg of args) {
    await seedAptsForSigungu(sgg);
  }

  // 2단계: 매매·전월세 (단지 매칭 후)
  for (const sgg of args) {
    const { nameMap, apts } = await buildNameMap(sgg);
    if (apts.length === 0) {
      console.log(`\n${SGG_NAMES[sgg]}: 단지 없어서 거래 시드 스킵`);
      continue;
    }
    console.log(`\n${SGG_NAMES[sgg]} 단지 nameMap: ${apts.length}개 (인덱스 ${nameMap.size})`);
    await seedTradesForSigungu(sgg, nameMap);
    await seedRentsForSigungu(sgg, nameMap);
  }

  // 최종 통계
  const { count: aptCount } = await sb.from('apartments').select('*', { count: 'exact', head: true });
  const { count: tradeCount } = await sb.from('trade_history').select('*', { count: 'exact', head: true });
  const { count: rentCount } = await sb.from('rent_history').select('*', { count: 'exact', head: true });

  const elapsed = Math.round((Date.now() - startedAt) / 1000);
  console.log(`\n=== 시드 완료 (${elapsed}초) ===`);
  console.log(`총 단지: ${aptCount}`);
  console.log(`총 매매: ${tradeCount}`);
  console.log(`총 전월세: ${rentCount}`);
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
