// apartments.latitude/longitude를 카카오 keyword 검색 결과(아파트 카테고리)로 재정렬.
// 기존 주소검색 API가 토지 centroid·노인정·상가 위치를 반환하는 경우가 많아 카카오맵에 보이는
// 단지 정식 마커와 어긋나는 문제 해결.
//
// 안전장치:
// - 카카오 keyword 검색 결과에서 category_name에 '아파트' 포함된 항목만 사용
// - 단지명 완전일치 → 부분일치 → 첫번째 결과 순으로 우선
// - 기존 좌표와 1km 이상 차이나면 의심하고 SKIP (오매칭 방지)
// - 동(行政區) 컨텍스트 query에 추가해 동명이 단지 충돌 방지
//
// 사용:
//   node scripts/refresh-apartment-coords.mjs                 # 전체
//   node scripts/refresh-apartment-coords.mjs 녹번             # 단지명 키워드 필터
//   node scripts/refresh-apartment-coords.mjs --sigungu 11380  # 시군구 필터 (은평구)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8')
  .split('\n')
  .forEach((line) => {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) process.env[m[1]] = m[2];
  });

const KEY = process.env.KAKAO_REST_KEY;
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

if (!KEY) {
  console.error('KAKAO_REST_KEY 없음');
  process.exit(1);
}

// 인자 파싱
const args = process.argv.slice(2);
let nameFilter = null;
let sigunguFilter = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--sigungu') sigunguFilter = args[++i];
  else nameFilter = args[i];
}

function haversineM(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function extractDistrict(address) {
  // "서울특별시 은평구 응암동 ..." → "은평구"
  const m = address?.match(/\S+(구|시(?!\s*\S+\s*구)|군)/);
  return m ? m[0] : '';
}

async function searchApt(name, address) {
  const district = extractDistrict(address);
  const url = new URL('https://dapi.kakao.com/v2/local/search/keyword.json');
  url.searchParams.set('query', district ? `${name} ${district}` : name);
  url.searchParams.set('size', '15');
  const res = await fetch(url.toString(), {
    headers: { Authorization: `KakaoAK ${KEY}` },
  });
  if (!res.ok) return null;
  const data = await res.json();

  // 1순위: 카테고리 '아파트'
  const aptOnly = (data.documents ?? []).filter((d) =>
    d.category_name?.includes('아파트')
  );
  if (aptOnly.length === 0) return null;

  // place_name 정확 일치 → 시작 일치 → 포함 → 첫번째
  const norm = (s) => s.replace(/아파트$/, '').replace(/\s+/g, '').toLowerCase();
  const targetN = norm(name);
  const exact = aptOnly.find((d) => norm(d.place_name) === targetN);
  const startsW = aptOnly.find((d) => norm(d.place_name).startsWith(targetN));
  const includes = aptOnly.find((d) => norm(d.place_name).includes(targetN));
  const pick = exact ?? startsW ?? includes ?? aptOnly[0];

  return {
    placeName: pick.place_name,
    lat: parseFloat(pick.y),
    lng: parseFloat(pick.x),
    address: pick.road_address_name || pick.address_name,
    matchType: exact ? 'exact' : startsW ? 'startsWith' : includes ? 'includes' : 'first',
  };
}

async function fetchAllApts() {
  // Supabase JS 기본 limit 1000 → range로 페이지네이션
  const PAGE = 1000;
  let from = 0;
  const all = [];
  while (true) {
    let q = sb
      .from('apartments')
      .select('id, name, address, dong_code, latitude, longitude')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .order('id')
      .range(from, from + PAGE - 1);
    if (sigunguFilter) q = q.like('dong_code', `${sigunguFilter}%`);
    if (nameFilter) q = q.ilike('name', `%${nameFilter}%`);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

async function main() {
  let apts;
  try { apts = await fetchAllApts(); } catch (e) { console.error('DB 조회 실패:', e.message); process.exit(1); }
  if (apts.length === 0) { console.log('대상 단지 없음'); return; }

  console.log(`\n=== 좌표 재정렬: ${apts.length}개 단지 ===\n`);
  let updated = 0, skippedFar = 0, skippedNotFound = 0, skippedSame = 0;

  for (const apt of apts) {
    const result = await searchApt(apt.name, apt.address);
    if (!result) {
      skippedNotFound++;
      console.log(`  ✗ ${apt.name.padEnd(25)} | 카카오 keyword 검색 결과 없음`);
      await new Promise((r) => setTimeout(r, 80));
      continue;
    }
    const diffM = Math.round(
      haversineM(apt.latitude, apt.longitude, result.lat, result.lng)
    );

    if (diffM > 1000) {
      skippedFar++;
      console.log(
        `  ⚠ ${apt.name.padEnd(25)} | ${diffM}m 차이 (오매칭 의심) → SKIP | "${result.placeName}"`
      );
    } else if (diffM === 0) {
      skippedSame++;
    } else {
      const { error: upErr } = await sb
        .from('apartments')
        .update({ latitude: result.lat, longitude: result.lng })
        .eq('id', apt.id);
      if (upErr) {
        console.log(`  ✗ ${apt.name.padEnd(25)} | DB 업데이트 실패: ${upErr.message}`);
      } else {
        updated++;
        console.log(
          `  ✓ ${apt.name.padEnd(25)} | ${diffM.toString().padStart(4)}m 이동 → "${result.placeName}" (${result.matchType})`
        );
      }
    }
    await new Promise((r) => setTimeout(r, 80)); // throttle
  }

  console.log(`\n=== 완료 ===`);
  console.log(`업데이트: ${updated}`);
  console.log(`동일: ${skippedSame}`);
  console.log(`오매칭 의심 (>1km): ${skippedFar}`);
  console.log(`검색 결과 없음: ${skippedNotFound}`);
}

main().catch((e) => { console.error('FATAL:', e); process.exit(1); });
