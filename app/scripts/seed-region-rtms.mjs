// K-Apt API에 데이터 없는 시군구를 위한 우회 시드.
//
// 원리: 국토부 RTMS 실거래가 API에서 12개월치 매매 raw fetch → 단지명·주소
//   unique 추출 → 카카오 keyword 검색으로 좌표·세대수·연식 추정 → apartments INSERT.
//   trade_history도 동시 적재.
//
// 사용:
//   # 화성시: 41591(남양·서부) + 41595(반월) + 41597(동탄)
//   node scripts/seed-region-rtms.mjs 41591 41595 41597
//
// K-Apt 보유 시군구는 seed-region.mjs를 쓰는 게 정확함 (입주년/세대수 정식).

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
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  });

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const KEY_RAW = process.env.KAPT_API_KEY || process.env.PUBLIC_DATA_API_KEY;
const KEY = KEY_RAW.includes('%') ? decodeURIComponent(KEY_RAW) : KEY_RAW;
const KAKAO = process.env.KAKAO_REST_KEY;

const SGG_NAMES = {
  '41591': '화성시(서부 남양)',
  '41595': '화성시(반월)',
  '41597': '화성시(동탄)',
  '41190': '부천시',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── RTMS 매매 fetch (12개월) ───
function parseRtmsXml(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = itemRegex.exec(xml)) !== null) {
    const inner = m[1];
    const get = (tag) => {
      const r = inner.match(new RegExp(`<${tag}>([^<]*)</${tag}>`));
      return r ? r[1].trim() : null;
    };
    items.push({
      aptNm: get('aptNm'),
      aptSeq: get('aptSeq'),
      umdNm: get('umdNm'),
      bonbun: get('bonbun'),
      bubun: get('bubun'),
      buildYear: get('buildYear'),
      dealYear: get('dealYear'),
      dealMonth: get('dealMonth'),
      dealDay: get('dealDay'),
      excluUseAr: get('excluUseAr'),
      dealAmount: get('dealAmount'),
      floor: get('floor'),
      dealingGbn: get('dealingGbn'),
      sggCd: get('sggCd'),
      jibun: get('jibun'),
    });
  }
  return items;
}

async function fetchRtmsTrades(lawd, ymd) {
  const all = [];
  let pageNo = 1;
  while (true) {
    const url = new URL('https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev');
    url.searchParams.set('serviceKey', KEY);
    url.searchParams.set('LAWD_CD', lawd);
    url.searchParams.set('DEAL_YMD', ymd);
    url.searchParams.set('numOfRows', '500');
    url.searchParams.set('pageNo', String(pageNo));
    const r = await fetch(url.toString());
    if (!r.ok) break;
    const xml = await r.text();
    const items = parseRtmsXml(xml);
    if (items.length === 0) break;
    all.push(...items);
    if (items.length < 500) break;
    pageNo++;
    await sleep(200);
  }
  return all;
}

function getRecentMonths(n) {
  const now = new Date();
  const out = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return out.reverse();
}

// ─── 카카오 keyword 검색 (단지명 + 자치구) → 좌표 + 카테고리 ───
async function geocodeApt(name, district) {
  const url = new URL('https://dapi.kakao.com/v2/local/search/keyword.json');
  url.searchParams.set('query', district ? `${name} ${district}` : name);
  url.searchParams.set('size', '15');
  const r = await fetch(url.toString(), {
    headers: { Authorization: `KakaoAK ${KAKAO}` },
  });
  if (!r.ok) return null;
  const data = await r.json();
  const aptOnly = (data.documents ?? []).filter((d) =>
    d.category_name?.includes('아파트')
  );
  if (aptOnly.length === 0) return null;
  const norm = (s) => s.replace(/아파트$/, '').replace(/\s+/g, '').toLowerCase();
  const target = norm(name);
  const pick =
    aptOnly.find((d) => norm(d.place_name) === target) ??
    aptOnly.find((d) => norm(d.place_name).includes(target)) ??
    aptOnly[0];
  return {
    lat: parseFloat(pick.y),
    lng: parseFloat(pick.x),
    address: pick.address_name ?? pick.road_address_name,
    placeName: pick.place_name,
  };
}

// ─── 가까운 역 (kakao subway category SW8 — Subway) ───
async function findNearestStation(lat, lng) {
  const url = new URL('https://dapi.kakao.com/v2/local/search/category.json');
  url.searchParams.set('category_group_code', 'SW8');
  url.searchParams.set('x', String(lng));
  url.searchParams.set('y', String(lat));
  url.searchParams.set('radius', '1500');
  url.searchParams.set('sort', 'distance');
  url.searchParams.set('size', '1');
  const r = await fetch(url.toString(), {
    headers: { Authorization: `KakaoAK ${KAKAO}` },
  });
  if (!r.ok) return null;
  const data = await r.json();
  const s = data.documents?.[0];
  if (!s) return null;
  return { name: s.place_name, distance: parseInt(s.distance, 10) };
}

// ─── 메인 시드 로직 ───
async function processSigungu(lawd) {
  const label = SGG_NAMES[lawd] ?? lawd;
  console.log(`\n📍 ${label} (${lawd}) — RTMS 12개월 매매 fetch`);

  const months = getRecentMonths(12);
  let allTrades = [];
  for (const ym of months) {
    const trades = await fetchRtmsTrades(lawd, ym);
    allTrades = allTrades.concat(trades);
    process.stdout.write(`   ${ym}: ${trades.length}건\n`);
    await sleep(150);
  }
  console.log(`   → 매매 raw 총 ${allTrades.length}건`);

  // unique 단지: aptSeq 기준
  const aptMap = new Map();
  for (const t of allTrades) {
    if (!t.aptSeq || !t.aptNm) continue;
    if (!aptMap.has(t.aptSeq)) {
      aptMap.set(t.aptSeq, {
        aptSeq: t.aptSeq,
        aptNm: t.aptNm.trim(),
        umdNm: t.umdNm?.trim(),
        buildYear: t.buildYear ? parseInt(t.buildYear, 10) : null,
        sggCd: t.sggCd,
      });
    }
  }
  console.log(`   → unique 단지 ${aptMap.size}개`);

  // 단지 INSERT (이미 raw_data->>aptSeq로 존재 시 skip)
  let success = 0, skip = 0, fail = 0;
  let i = 0;
  for (const apt of aptMap.values()) {
    i++;
    const { data: existing } = await sb
      .from('apartments')
      .select('id')
      .eq('raw_data->>aptSeq', apt.aptSeq)
      .maybeSingle();
    if (existing) { skip++; continue; }

    // 카카오 검색 — "동탄역중흥에스클래스 화성시 동탄"
    const district = label.replace(/\(.*\)/, '').trim();
    const coord = await geocodeApt(apt.aptNm, `${district} ${apt.umdNm ?? ''}`.trim());
    await sleep(100);

    let station = null;
    if (coord) {
      station = await findNearestStation(coord.lat, coord.lng);
      await sleep(100);
    }

    const { data: inserted, error } = await sb.from('apartments').insert({
      name: apt.aptNm,
      address: coord?.address ?? `경기도 화성시 ${apt.umdNm ?? ''}`.trim(),
      dong_code: apt.sggCd ? `${apt.sggCd}` : null,
      total_units: null, // RTMS에는 세대수 정보 없음
      built_year: apt.buildYear,
      nearest_station: station?.name ?? null,
      station_distance_m: station?.distance ?? null,
      latitude: coord?.lat ?? null,
      longitude: coord?.lng ?? null,
      raw_data: {
        aptSeq: apt.aptSeq,
        umdNm: apt.umdNm,
        sggCd: apt.sggCd,
        sourceFlag: 'rtms-only',
      },
    }).select('id').single();

    if (error) {
      fail++;
      if (fail <= 3) console.log(`   ✗ ${apt.aptNm}: ${error.message}`);
    } else {
      success++;
      if (success % 20 === 0 || success <= 3) {
        process.stdout.write(`   [${i}/${aptMap.size}] ✓ ${apt.aptNm} (${apt.buildYear ?? '?'})\n`);
      }
    }
    await sleep(100);
  }
  console.log(`   → 단지 신규 ${success} · 스킵 ${skip} · 실패 ${fail}`);

  // trade_history INSERT
  // 단지별 id 매핑
  const aptIdMap = new Map();
  const aptSeqs = [...aptMap.keys()];
  for (let j = 0; j < aptSeqs.length; j += 100) {
    const chunk = aptSeqs.slice(j, j + 100);
    for (const seq of chunk) {
      const { data } = await sb
        .from('apartments')
        .select('id')
        .eq('raw_data->>aptSeq', seq)
        .maybeSingle();
      if (data) aptIdMap.set(seq, data.id);
    }
  }

  // 기존 trade 삭제 (idempotent re-seed)
  const aptIds = [...aptIdMap.values()];
  if (aptIds.length > 0) {
    for (let j = 0; j < aptIds.length; j += 100) {
      await sb.from('trade_history').delete().in('apartment_id', aptIds.slice(j, j + 100));
    }
  }

  let tradeInserted = 0;
  const inserts = [];
  for (const t of allTrades) {
    if (!t.aptSeq || !aptIdMap.has(t.aptSeq)) continue;
    if (!t.dealYear || !t.dealMonth || !t.dealDay) continue;
    const dealDate = `${t.dealYear}-${String(t.dealMonth).padStart(2, '0')}-${String(t.dealDay).padStart(2, '0')}`;
    const areaM2 = parseFloat(t.excluUseAr);
    const price10k = parseInt((t.dealAmount ?? '').replace(/,/g, ''), 10);
    const floor = parseInt(t.floor, 10);
    if (isNaN(areaM2) || isNaN(price10k)) continue;
    inserts.push({
      apartment_id: aptIdMap.get(t.aptSeq),
      deal_date: dealDate,
      area_m2: areaM2,
      price_10k: price10k,
      floor: isNaN(floor) ? null : floor,
      deal_type: t.dealingGbn ?? null,
    });
  }
  // 100개씩 batch insert
  for (let j = 0; j < inserts.length; j += 100) {
    const { error } = await sb.from('trade_history').insert(inserts.slice(j, j + 100));
    if (!error) tradeInserted += Math.min(100, inserts.length - j);
  }
  console.log(`   → 매매 ${tradeInserted}건 적재`);

  return { aptCount: success, tradeCount: tradeInserted };
}

// ─── 메인 ───
async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: node scripts/seed-region-rtms.mjs <LAWD_CD> [...]');
    process.exit(1);
  }
  const startTs = Date.now();
  console.log(`=== seed-region-rtms 시작: ${args.join(', ')} ===`);

  let totalApts = 0, totalTrades = 0;
  for (const lawd of args) {
    const r = await processSigungu(lawd);
    totalApts += r.aptCount;
    totalTrades += r.tradeCount;
  }

  const elapsed = Math.round((Date.now() - startTs) / 1000);
  console.log(`\n=== 시드 완료 (${elapsed}s) ===`);
  console.log(`총 신규 단지: ${totalApts}`);
  console.log(`총 매매: ${totalTrades}`);
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
