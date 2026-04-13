// apartments 테이블의 단지 중 lat/lng가 NULL인 것을 카카오 REST 주소검색으로 채움.
// 우선순위:
//   1) raw_data.doroJuso (도로명 주소) — 가장 정확
//   2) address (지번 주소) — fallback
// 카카오 응답에서 x=longitude, y=latitude 임에 주의.
//
// 사용법: cd app && node scripts/geocode-apartments.mjs

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
const KAKAO_REST_KEY = process.env.KAKAO_REST_KEY;

if (!KAKAO_REST_KEY) {
  console.error('KAKAO_REST_KEY 환경변수가 없습니다');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function searchAddress(query) {
  const url = new URL('https://dapi.kakao.com/v2/local/search/address.json');
  url.searchParams.set('query', query);
  const res = await fetch(url.toString(), {
    headers: { Authorization: `KakaoAK ${KAKAO_REST_KEY}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.documents?.[0] ?? null;
}

// 카카오 키워드 검색 (주소 검색 실패 시 fallback)
async function searchKeyword(query) {
  const url = new URL('https://dapi.kakao.com/v2/local/search/keyword.json');
  url.searchParams.set('query', query);
  url.searchParams.set('size', '5');
  const res = await fetch(url.toString(), {
    headers: { Authorization: `KakaoAK ${KAKAO_REST_KEY}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.documents?.[0] ?? null;
}

async function main() {
  const { data: apts, error } = await sb
    .from('apartments')
    .select('id, name, address, raw_data, latitude, longitude')
    .is('latitude', null)
    .order('name');

  if (error) {
    console.error('apartments 조회 실패:', error.message);
    process.exit(1);
  }

  console.log(`=== ${apts.length}개 단지 지오코딩 시작 ===\n`);

  let resolved = 0;
  let viaRoad = 0;
  let viaJibun = 0;
  let viaKeyword = 0;
  const failed = [];

  for (const apt of apts) {
    const doro = apt.raw_data?.doroJuso;
    let result = null;
    let via = null;

    // 1순위: 도로명 주소
    if (doro) {
      result = await searchAddress(doro);
      if (result) via = 'road';
    }

    // 2순위: 지번 주소
    if (!result && apt.address) {
      await new Promise((r) => setTimeout(r, 150));
      result = await searchAddress(apt.address);
      if (result) via = 'jibun';
    }

    // 3순위: 단지명 키워드 검색
    if (!result) {
      await new Promise((r) => setTimeout(r, 150));
      result = await searchKeyword(`${apt.name} 영등포구`);
      if (result) via = 'keyword';
    }

    if (!result) {
      console.log(`  ✗ ${apt.name.padEnd(20)} | 매칭 실패`);
      failed.push(apt.name);
    } else {
      const lat = parseFloat(result.y);
      const lng = parseFloat(result.x);
      const matchedName = result.road_address?.building_name || result.place_name || '';

      const { error: upErr } = await sb
        .from('apartments')
        .update({ latitude: lat, longitude: lng })
        .eq('id', apt.id);

      if (upErr) {
        console.log(`  ✗ ${apt.name.padEnd(20)} | DB 업데이트 실패: ${upErr.message}`);
        failed.push(apt.name);
      } else {
        console.log(
          `  ✓ ${apt.name.padEnd(20)} | ${lat.toFixed(6)}, ${lng.toFixed(6)} | via:${via}${matchedName ? ' (' + matchedName + ')' : ''}`
        );
        resolved++;
        if (via === 'road') viaRoad++;
        if (via === 'jibun') viaJibun++;
        if (via === 'keyword') viaKeyword++;
      }
    }

    await new Promise((r) => setTimeout(r, 150));
  }

  console.log(`\n=== 완료 ===`);
  console.log(`성공: ${resolved} / ${apts.length}`);
  console.log(`  - 도로명 매칭: ${viaRoad}`);
  console.log(`  - 지번 매칭: ${viaJibun}`);
  console.log(`  - 키워드 매칭: ${viaKeyword}`);
  if (failed.length > 0) {
    console.log(`실패 ${failed.length}: ${failed.join(', ')}`);
  }
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
