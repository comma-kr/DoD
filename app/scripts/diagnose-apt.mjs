// 단지명 키워드로 apartments + trade_history 매칭 상태 진단.
// 사용: node scripts/diagnose-apt.mjs 파크힐스
//      node scripts/diagnose-apt.mjs 남산타운

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

const keyword = process.argv[2];
if (!keyword) {
  console.error('사용: node scripts/diagnose-apt.mjs <키워드>');
  process.exit(1);
}

const { data: apts } = await sb
  .from('apartments')
  .select('id, name, address, dong_code, total_units, latitude, longitude')
  .ilike('name', `%${keyword}%`);

console.log(`\n[apartments] "${keyword}" 매칭: ${apts?.length ?? 0}개\n`);
console.log('id(8자) | 단지명 | 주소 | 세대 | 좌표 | 거래수 | 최근가(만원) | 최근거래일');

for (const apt of apts ?? []) {
  const { count: tradeCount } = await sb
    .from('trade_history')
    .select('*', { count: 'exact', head: true })
    .eq('apartment_id', apt.id);

  const { data: latestTrade } = await sb
    .from('trade_history')
    .select('price_10k, area_m2, deal_date, deal_type')
    .eq('apartment_id', apt.id)
    .order('deal_date', { ascending: false })
    .limit(1);

  const last = latestTrade?.[0];
  const coordStr =
    apt.latitude && apt.longitude
      ? `${apt.latitude.toFixed(4)},${apt.longitude.toFixed(4)}`
      : 'NULL';

  console.log(
    [
      apt.id.slice(0, 8),
      apt.name,
      apt.address?.slice(0, 25),
      apt.total_units ?? '-',
      coordStr,
      tradeCount,
      last ? `${last.price_10k} (${last.area_m2}㎡, ${last.deal_type ?? '-'})` : '-',
      last?.deal_date ?? '-',
    ].join(' | ')
  );
}
