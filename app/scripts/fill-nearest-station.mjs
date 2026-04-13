// 각 단지 좌표에서 가장 가까운 지하철역을 카카오 카테고리 검색(SW8)으로 찾아
// apartments.nearest_station, station_distance_m 컬럼에 채움.
//
// 사용법: cd app && node scripts/fill-nearest-station.mjs

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

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function findNearestStation(lat, lng) {
  const url = new URL('https://dapi.kakao.com/v2/local/search/category.json');
  url.searchParams.set('category_group_code', 'SW8'); // 지하철역
  url.searchParams.set('x', String(lng));
  url.searchParams.set('y', String(lat));
  url.searchParams.set('radius', '1500'); // 반경 1.5km
  url.searchParams.set('sort', 'distance');
  url.searchParams.set('size', '5');

  const res = await fetch(url.toString(), {
    headers: { Authorization: `KakaoAK ${KAKAO_REST_KEY}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.documents?.[0] ?? null;
}

async function main() {
  const { data: apts } = await sb
    .from('apartments')
    .select('id, name, latitude, longitude')
    .not('latitude', 'is', null)
    .order('name');

  console.log(`=== ${apts.length}개 단지 가까운 역 매칭 시작 ===\n`);

  let success = 0;
  const stationCount = new Map();

  for (const apt of apts) {
    const station = await findNearestStation(apt.latitude, apt.longitude);

    if (!station) {
      console.log(`  ✗ ${apt.name.padEnd(20)} | 1.5km 내 역 없음`);
    } else {
      // place_name 예: "여의도역 9호선" 또는 "여의도역" 만 올 수 있음
      // category_name 으로 분류 정확하게 확인
      const stationName = station.place_name.split(' ')[0]; // "여의도역" 등 첫 단어
      const distance = parseInt(station.distance, 10); // meters

      const { error } = await sb
        .from('apartments')
        .update({
          nearest_station: station.place_name,
          station_distance_m: distance,
        })
        .eq('id', apt.id);

      if (error) {
        console.log(`  ✗ ${apt.name.padEnd(20)} | DB 업데이트 실패: ${error.message}`);
      } else {
        console.log(`  ✓ ${apt.name.padEnd(20)} | ${station.place_name.padEnd(20)} | ${distance}m`);
        success++;
        stationCount.set(stationName, (stationCount.get(stationName) || 0) + 1);
      }
    }

    await new Promise((r) => setTimeout(r, 150));
  }

  console.log(`\n=== 완료: ${success} / ${apts.length} ===`);
  console.log('\n역별 매칭 분포:');
  const sorted = [...stationCount.entries()].sort((a, b) => b[1] - a[1]);
  for (const [name, count] of sorted) {
    console.log(`  - ${name}: ${count}개 단지`);
  }
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
