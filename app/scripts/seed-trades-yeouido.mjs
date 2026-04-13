// 여의도동 24개 단지의 최근 12개월 실거래가를 국토부 API로 가져와 trade_history에 적재.
// API: RTMSDataSvcAptTrade (기본 버전)
// 필터: 영등포구 11560 → umdNm='여의도동' → 단지명 매칭

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

const LAWD_CD = '11560'; // 영등포구
const TARGET_DONG = '여의도동';

// 최근 12개월
function getRecentMonths(count = 12) {
  const months = [];
  const now = new Date(2026, 3, 1); // 2026-04 기준
  for (let i = 1; i <= count; i++) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - i);
    const ym = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
    months.push(ym);
  }
  return months.reverse(); // 오래된 것부터
}

// 로마숫자/한자숫자 → 아라비아숫자
const ROMAN_MAP = {
  Ⅰ: '1', Ⅱ: '2', Ⅲ: '3', Ⅳ: '4', Ⅴ: '5',
  I: '1', II: '2', III: '3', IV: '4', V: '5',
  '1차': '1', '2차': '2', '3차': '3', '4차': '4', '5차': '5',
};

// 단지명 정규화 (매칭용)
function normalize(name) {
  let n = name;
  // 괄호 내용 → 별도 추출 후 본명에서 제거
  n = n.replace(/\((.*?)\)/g, ' $1 '); // "순복음(초원)" → "순복음 초원"
  // 로마숫자/한자숫자 → 아라비아
  for (const [from, to] of Object.entries(ROMAN_MAP)) {
    n = n.replace(new RegExp(from, 'g'), to);
  }
  // 공백·특수문자 제거
  n = n.replace(/\s+/g, '').replace(/[·.,_-]/g, '');
  // 접미사 제거
  n = n.replace(/아파트$/, '').replace(/주상복합$/, '');
  // 접두사 변형: "여의" 또는 "여의도" 둘 다 정규화
  // (그대로 두고 매칭 시 substring 처리)
  return n.toLowerCase();
}

// XML → 객체 배열
function parseTradeXml(xml) {
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

async function fetchTradesByMonth(ym, pageNo = 1, numOfRows = 200) {
  const url = new URL('https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade');
  url.searchParams.set('serviceKey', KEY);
  url.searchParams.set('LAWD_CD', LAWD_CD);
  url.searchParams.set('DEAL_YMD', ym);
  url.searchParams.set('numOfRows', String(numOfRows));
  url.searchParams.set('pageNo', String(pageNo));

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${ym}`);
  return parseTradeXml(await res.text());
}

async function main() {
  console.log('=== 1단계: DB의 여의도 단지 24개 로드 ===');
  const { data: apts } = await sb
    .from('apartments')
    .select('id, name')
    .order('name');

  const normalizedMap = new Map(); // normalized name → apartment id
  // "여의도삼부" → ["여의도삼부", "삼부"] 양쪽 모두 인덱싱
  for (const apt of apts) {
    const norm = normalize(apt.name);
    normalizedMap.set(norm, apt.id);
    // 여의도/여의 접두어 제거 버전도 추가
    const stripped = norm.replace(/^여의도?/, '');
    if (stripped.length >= 2 && !normalizedMap.has(stripped)) {
      normalizedMap.set(stripped, apt.id);
    }
  }
  console.log(`   ${apts.length}개 단지 로드 완료 (매칭 인덱스 ${normalizedMap.size}개)`);

  // 매칭 헬퍼: 정확 → 접두어 제거 → 부분 매칭 (양방향)
  function matchApartment(apiName) {
    const norm = normalize(apiName);

    // 1. 정확 매칭
    if (normalizedMap.has(norm)) return normalizedMap.get(norm);

    // 2. 접두어 제거 매칭
    const stripped = norm.replace(/^여의도?/, '');
    if (stripped.length >= 2 && normalizedMap.has(stripped)) {
      return normalizedMap.get(stripped);
    }

    // 3. 부분 매칭 (양방향)
    for (const [dbNorm, id] of normalizedMap.entries()) {
      if (dbNorm.length < 2) continue;
      if (norm.includes(dbNorm) || dbNorm.includes(norm)) {
        return id;
      }
      if (stripped.length >= 2 && (stripped.includes(dbNorm) || dbNorm.includes(stripped))) {
        return id;
      }
    }

    return null;
  }

  console.log('\n=== 2단계: 기존 trade_history 비우기 ===');
  await sb.from('trade_history').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  console.log('\n=== 3단계: 12개월 거래 데이터 수집 ===');
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
      const items = await fetchTradesByMonth(ym, pageNo);
      if (items.length === 0) break;
      monthItems = monthItems.concat(items);
      if (items.length < 200) break;
      pageNo++;
      await new Promise((r) => setTimeout(r, 200));
    }

    // 여의도동만 필터
    const yeouidoItems = monthItems.filter((it) => it.umdNm === TARGET_DONG);

    // 매칭
    const inserts = [];
    for (const it of yeouidoItems) {
      const aptId = matchApartment(it.aptNm);
      if (!aptId) {
        unmatchedNames.add(it.aptNm);
        continue;
      }
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
      if (error) {
        console.log(` ERROR ${error.message}`);
      } else {
        console.log(
          ` 영등포구 ${monthItems.length}건 → 여의도 ${yeouidoItems.length}건 → 매칭 ${inserts.length}건 적재`
        );
        totalInserted += inserts.length;
      }
    } else {
      console.log(` 영등포구 ${monthItems.length}건 → 여의도 ${yeouidoItems.length}건 → 매칭 0건`);
    }

    totalFetched += monthItems.length;
    totalMatched += yeouidoItems.length;
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`\n=== 완료 ===`);
  console.log(`총 영등포구 거래: ${totalFetched}건`);
  console.log(`여의도동 거래: ${totalMatched}건`);
  console.log(`매칭·적재: ${totalInserted}건`);

  if (unmatchedNames.size > 0) {
    console.log(`\n매칭 실패한 단지명 (${unmatchedNames.size}종):`);
    for (const n of unmatchedNames) console.log(`  - ${n}`);
  }

  // 단지별 거래 건수 분포
  console.log('\n단지별 적재된 거래 건수:');
  const { data: counts } = await sb
    .from('trade_history')
    .select('apartment_id, apartments(name)')
    .order('apartment_id');
  const byApt = new Map();
  for (const r of counts ?? []) {
    const name = r.apartments?.name ?? r.apartment_id;
    byApt.set(name, (byApt.get(name) || 0) + 1);
  }
  for (const [name, n] of [...byApt.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${name.padEnd(25)} ${n}건`);
  }
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
