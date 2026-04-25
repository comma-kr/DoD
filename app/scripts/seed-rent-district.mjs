// 특정 법정동의 최근 12개월 전월세 실거래가를 국토부 API로 가져와
// rent_history 테이블에 적재. 매매(seed-trades)와 짝.
//
// 사용법:
//   node scripts/seed-rent-district.mjs                  ← 기본: 영등포구 11560 + 여의도동
//   node scripts/seed-rent-district.mjs 11650 잠실동      ← LAWD_CD + 동명
//
// 매매와 같은 단지 매칭 로직을 재사용 (단지명 정규화).

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
const KEY_RAW = process.env.PUBLIC_DATA_API_KEY;
const KEY = KEY_RAW.includes('%') ? decodeURIComponent(KEY_RAW) : KEY_RAW;

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ==== 인자 ====
const LAWD_CD = process.argv[2] ?? '11560';
const TARGET_DONG = process.argv[3] ?? '여의도동';

// ==== 단지명 정규화 (매매 시드와 동일) ====
const ROMAN_MAP = {
  Ⅰ: '1', Ⅱ: '2', Ⅲ: '3', Ⅳ: '4', Ⅴ: '5',
  I: '1', II: '2', III: '3', IV: '4', V: '5',
  '1차': '1', '2차': '2', '3차': '3', '4차': '4', '5차': '5',
};

function normalize(name) {
  let n = name;
  n = n.replace(/\((.*?)\)/g, ' $1 ');
  for (const [from, to] of Object.entries(ROMAN_MAP)) {
    n = n.replace(new RegExp(from, 'g'), to);
  }
  n = n.replace(/\s+/g, '').replace(/[·.,_-]/g, '');
  n = n.replace(/아파트$/, '').replace(/주상복합$/, '');
  return n.toLowerCase();
}

// ==== 최근 12개월 ====
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

// ==== XML 파서 ====
function parseRentXml(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = itemRegex.exec(xml)) !== null) {
    const inner = m[1];
    const obj = {};
    const fieldRegex = /<(\w+)>([^<]*)<\/\1>/g;
    let f;
    while ((f = fieldRegex.exec(inner)) !== null) {
      obj[f[1]] = f[2].trim();
    }
    items.push(obj);
  }
  return items;
}

async function fetchRentByMonth(ym, pageNo = 1, numOfRows = 200) {
  const url = new URL(
    'https://apis.data.go.kr/1613000/RTMSDataSvcAptRent/getRTMSDataSvcAptRent'
  );
  url.searchParams.set('serviceKey', KEY);
  url.searchParams.set('LAWD_CD', LAWD_CD);
  url.searchParams.set('DEAL_YMD', ym);
  url.searchParams.set('numOfRows', String(numOfRows));
  url.searchParams.set('pageNo', String(pageNo));

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${ym}`);
  return parseRentXml(await res.text());
}

async function main() {
  console.log(`=== rent_history 시드: LAWD_CD=${LAWD_CD}, 동=${TARGET_DONG} ===\n`);

  console.log('1단계: DB의 단지 로드');
  const { data: apts } = await sb.from('apartments').select('id, name').order('name');

  const normalizedMap = new Map();
  for (const apt of apts) {
    const norm = normalize(apt.name);
    normalizedMap.set(norm, apt.id);
    const stripped = norm.replace(/^여의도?/, '');
    if (stripped.length >= 2 && !normalizedMap.has(stripped)) {
      normalizedMap.set(stripped, apt.id);
    }
  }
  console.log(`   ${apts.length}개 단지 로드 (인덱스 ${normalizedMap.size}개)`);

  function matchApartment(apiName) {
    const norm = normalize(apiName);
    if (normalizedMap.has(norm)) return normalizedMap.get(norm);
    const stripped = norm.replace(/^여의도?/, '');
    if (stripped.length >= 2 && normalizedMap.has(stripped)) {
      return normalizedMap.get(stripped);
    }
    for (const [dbNorm, id] of normalizedMap.entries()) {
      if (dbNorm.length < 2) continue;
      if (norm.includes(dbNorm) || dbNorm.includes(norm)) return id;
      if (
        stripped.length >= 2 &&
        (stripped.includes(dbNorm) || dbNorm.includes(stripped))
      )
        return id;
    }
    return null;
  }

  console.log(`\n2단계: 기존 rent_history (${TARGET_DONG} 단지) 비우기`);
  const aptIds = apts.map((a) => a.id);
  await sb.from('rent_history').delete().in('apartment_id', aptIds);

  console.log('\n3단계: 12개월 전월세 데이터 수집');
  const months = getRecentMonths(12);
  let totalFetched = 0;
  let totalMatched = 0;
  let totalInserted = 0;
  const unmatchedNames = new Set();

  for (const ym of months) {
    process.stdout.write(`  ${ym}: 호출 중...`);
    let monthItems = [];
    let pageNo = 1;
    while (true) {
      const items = await fetchRentByMonth(ym, pageNo);
      if (items.length === 0) break;
      monthItems = monthItems.concat(items);
      if (items.length < 200) break;
      pageNo++;
      await new Promise((r) => setTimeout(r, 200));
    }

    const dongItems = monthItems.filter((it) => it.umdNm === TARGET_DONG);

    const inserts = [];
    for (const it of dongItems) {
      const aptId = matchApartment(it.aptNm);
      if (!aptId) {
        unmatchedNames.add(it.aptNm);
        continue;
      }
      const dealDate = `${it.dealYear}-${String(it.dealMonth).padStart(2, '0')}-${String(it.dealDay).padStart(2, '0')}`;
      const deposit10k = parseInt((it.deposit ?? '0').replace(/,/g, ''), 10);
      const monthly10k = parseInt((it.monthlyRent ?? '0').replace(/,/g, ''), 10) || 0;
      const areaM2 = parseFloat(it.excluUseAr);
      const floor = parseInt(it.floor, 10);

      if (isNaN(deposit10k) || isNaN(areaM2)) continue;

      // 월세 0이면 전세, 아니면 월세
      const contractType = monthly10k > 0 ? '월세' : '전세';

      inserts.push({
        apartment_id: aptId,
        deal_date: dealDate,
        area_m2: areaM2,
        deposit_10k: deposit10k,
        monthly_rent_10k: monthly10k,
        floor: isNaN(floor) ? null : floor,
        contract_type: contractType,
        deal_type: it.dealingGbn ?? null,
        raw_contract_type: it.contractType ?? null,
      });
    }

    if (inserts.length > 0) {
      const { error } = await sb.from('rent_history').insert(inserts);
      if (error) {
        console.log(` ERROR ${error.message}`);
      } else {
        console.log(
          ` 전체 ${monthItems.length}건 → ${TARGET_DONG} ${dongItems.length}건 → 매칭 ${inserts.length}건 적재`
        );
        totalInserted += inserts.length;
      }
    } else {
      console.log(` 전체 ${monthItems.length}건 → ${TARGET_DONG} ${dongItems.length}건 → 매칭 0건`);
    }

    totalFetched += monthItems.length;
    totalMatched += dongItems.length;
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`\n=== 완료 ===`);
  console.log(`총 전월세 거래: ${totalFetched}건`);
  console.log(`${TARGET_DONG} 거래: ${totalMatched}건`);
  console.log(`매칭·적재: ${totalInserted}건`);

  if (unmatchedNames.size > 0) {
    console.log(`\n매칭 실패한 단지명 (${unmatchedNames.size}종):`);
    for (const n of unmatchedNames) console.log(`  - ${n}`);
  }

  console.log('\n단지별 전월세 거래 분포:');
  const { data: counts } = await sb
    .from('rent_history')
    .select('apartment_id, contract_type, apartments(name)');
  const byApt = new Map();
  for (const r of counts ?? []) {
    const name = r.apartments?.name ?? r.apartment_id;
    if (!byApt.has(name)) byApt.set(name, { 전세: 0, 월세: 0 });
    byApt.get(name)[r.contract_type] = (byApt.get(name)[r.contract_type] || 0) + 1;
  }
  for (const [name, c] of [...byApt.entries()].sort(
    (a, b) => b[1].전세 + b[1].월세 - (a[1].전세 + a[1].월세)
  )) {
    console.log(`  ${name.padEnd(25)} 전세 ${c.전세}건 · 월세 ${c.월세}건`);
  }
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
