// 카카오 keyword 검색으로 단지 정확 좌표 확인 (DB 좌표와 비교).
// 사용: node scripts/diagnose-coord.mjs 녹번역e편한세상캐슬

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

const keyword = process.argv[2];
if (!keyword) { console.error('사용: node scripts/diagnose-coord.mjs <단지명>'); process.exit(1); }

const { data: apts } = await sb
  .from('apartments')
  .select('id, name, address, latitude, longitude')
  .ilike('name', `%${keyword}%`)
  .limit(5);

console.log(`\n[DB] ${apts?.length ?? 0}개 매칭`);
for (const apt of apts ?? []) {
  console.log(`  ${apt.name} | ${apt.address}`);
  console.log(`  → DB 좌표: ${apt.latitude}, ${apt.longitude}`);

  const url = new URL('https://dapi.kakao.com/v2/local/search/keyword.json');
  url.searchParams.set('query', apt.name);
  url.searchParams.set('size', '15');
  const res = await fetch(url, { headers: { Authorization: `KakaoAK ${KEY}` } });
  const data = await res.json();
  console.log(`  [Kakao 키워드 검색] ${data.documents?.length ?? 0}건`);
  for (const doc of (data.documents ?? []).slice(0, 6)) {
    const isApt = doc.category_name?.includes('아파트');
    console.log(
      `    ${isApt ? '🏢' : '  '} ${doc.place_name.padEnd(25)} | ${doc.category_name?.slice(0, 35)} | ${doc.y}, ${doc.x}`
    );
  }
  console.log();
}
