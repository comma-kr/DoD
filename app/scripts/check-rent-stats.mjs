// 임시 디버그: rent_history 적재 결과 + 전세가율 계산 가능 단지 점검.
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

console.log('=== rent_history 적재 결과 ===\n');

const { data: rents } = await sb
  .from('rent_history')
  .select('apartment_id, contract_type, deal_type, area_m2, deposit_10k, monthly_rent_10k, apartments(name)');

console.log(`총 전월세 거래: ${rents?.length ?? 0}건`);
const byType = { 전세: 0, 월세: 0, 미상: 0 };
for (const r of rents ?? []) byType[r.contract_type ?? '미상'] = (byType[r.contract_type ?? '미상'] || 0) + 1;
console.log(`  · 전세 ${byType.전세}건 / 월세 ${byType.월세}건`);

// 단지별 분포
const byApt = new Map();
for (const r of rents ?? []) {
  const name = r.apartments?.name ?? r.apartment_id;
  if (!byApt.has(name)) byApt.set(name, { 전세: 0, 월세: 0 });
  byApt.get(name)[r.contract_type] = (byApt.get(name)[r.contract_type] || 0) + 1;
}

console.log('\n--- 단지별 전월세 분포 (전세/월세) ---');
for (const [name, c] of [...byApt.entries()].sort((a, b) => (b[1].전세 + b[1].월세) - (a[1].전세 + a[1].월세))) {
  console.log(`  ${name.padEnd(25)} 전세 ${String(c.전세).padStart(3)} / 월세 ${String(c.월세).padStart(3)}`);
}

// 전세가율 계산 가능한 단지 = 같은 정수 m² 평형에 매매 + 전세 둘 다 있는 단지
console.log('\n--- 전세가율 계산 가능 단지 점검 (같은 평형 매매 + 전세 둘 다 있는 곳) ---');
const { data: trades } = await sb
  .from('trade_history')
  .select('apartment_id, area_m2, price_10k, deal_type, apartments(name)');

const saleByApt = new Map();
for (const t of trades ?? []) {
  if (t.deal_type === '직거래') continue;
  const name = t.apartments?.name ?? t.apartment_id;
  if (!saleByApt.has(name)) saleByApt.set(name, new Map());
  const k = Math.round(t.area_m2);
  if (!saleByApt.get(name).has(k)) saleByApt.get(name).set(k, []);
  saleByApt.get(name).get(k).push(t);
}

const jeonseByApt = new Map();
for (const r of rents ?? []) {
  if (r.contract_type !== '전세' || r.deal_type === '직거래') continue;
  const name = r.apartments?.name ?? r.apartment_id;
  if (!jeonseByApt.has(name)) jeonseByApt.set(name, new Map());
  const k = Math.round(r.area_m2);
  if (!jeonseByApt.get(name).has(k)) jeonseByApt.get(name).set(k, []);
  jeonseByApt.get(name).get(k).push(r);
}

let ok = 0;
for (const [name, saleMap] of saleByApt.entries()) {
  const jeonseMap = jeonseByApt.get(name);
  if (!jeonseMap) continue;
  const matched = [];
  for (const [area, sales] of saleMap.entries()) {
    const jeonses = jeonseMap.get(area);
    if (!jeonses || jeonses.length === 0) continue;
    const saleAvg = sales.reduce((s, t) => s + t.price_10k, 0) / sales.length;
    const jeonseAvg = jeonses.reduce((s, r) => s + r.deposit_10k, 0) / jeonses.length;
    const pct = Math.round((jeonseAvg / saleAvg) * 100);
    matched.push({ area, sales: sales.length, jeonses: jeonses.length, pct });
  }
  if (matched.length === 0) continue;
  matched.sort((a, b) => (b.sales + b.jeonses) - (a.sales + a.jeonses));
  const best = matched[0];
  console.log(`  ✓ ${name.padEnd(20)} 전용 ${best.area}㎡ · 매매 ${best.sales}건 · 전세 ${best.jeonses}건 → 전세가율 ${best.pct}%`);
  ok++;
}
console.log(`\n전세가율 계산 가능 단지: ${ok}개 / 매매가 있는 단지 ${saleByApt.size}개`);
