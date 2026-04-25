// Tier1 백테스팅: 시드된 전체 데이터로 새 기능 검증.
// - 권역 percentile 분포 합리적인지
// - 비교 추천 단지 매칭률
// - 평당가 / 전세가율 / 갭 계산 결과 정상값 범위 인지

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

const PYEONG_M2 = 3.3058;
const SUPPLY_RATIO = 0.77;
const calcPpy = (price10k, areaM2) =>
  Math.round((price10k * PYEONG_M2 * SUPPLY_RATIO) / areaM2);

console.log('=== Tier1 백테스팅 ===\n');

// ===== 1. DB 적재 현황 =====
console.log('▶ 1. DB 현황');
const { count: aptCount } = await sb.from('apartments').select('*', { count: 'exact', head: true });
const { count: tradeCount } = await sb.from('trade_history').select('*', { count: 'exact', head: true });
const { count: rentCount } = await sb.from('rent_history').select('*', { count: 'exact', head: true });
console.log(`  단지 ${aptCount} / 매매 ${tradeCount} / 전월세 ${rentCount}`);

// 시군구별 분포
const { data: aptsAll } = await sb.from('apartments').select('id, name, dong_code, total_units');
const sggMap = { '11200': '성동구', '11440': '마포구', '11560': '영등포구' };
const sggDist = new Map();
for (const apt of aptsAll ?? []) {
  const sgg = (apt.dong_code ?? '?????').slice(0, 5);
  if (!sggDist.has(sgg)) sggDist.set(sgg, []);
  sggDist.get(sgg).push(apt);
}
for (const [sgg, list] of sggDist) {
  console.log(`  · ${sggMap[sgg] ?? sgg}: ${list.length}단지`);
}

// ===== 2. 매매 데이터 매칭률 =====
console.log('\n▶ 2. 매매 시드 매칭률');
const { data: tradesByApt } = await sb
  .from('trade_history')
  .select('apartment_id, deal_type', { count: 'exact' });
const aptsWithTrades = new Set((tradesByApt ?? []).map((t) => t.apartment_id));
console.log(`  거래 데이터 있는 단지: ${aptsWithTrades.size} / ${aptCount} (${Math.round((aptsWithTrades.size / aptCount) * 100)}%)`);

const dealTypeDist = { '중개거래': 0, '직거래': 0, null: 0 };
for (const t of tradesByApt ?? []) dealTypeDist[t.deal_type ?? 'null']++;
console.log(`  · 중개거래 ${dealTypeDist['중개거래']} (${Math.round(dealTypeDist['중개거래'] / tradeCount * 100)}%)`);
console.log(`  · 직거래   ${dealTypeDist['직거래']} (${Math.round(dealTypeDist['직거래'] / tradeCount * 100)}%)`);
console.log(`  · null     ${dealTypeDist['null']}`);

// ===== 3. 평당가 분포 (백분위 분포 합리성 체크) =====
console.log('\n▶ 3. 시군구별 평당가 분포 (직거래 제외, 공급면적 기준)');

for (const [sgg, list] of sggDist) {
  if (sgg === '?????') continue;
  const aptIds = list.map((a) => a.id);
  const { data: trades } = await sb
    .from('trade_history')
    .select('apartment_id, price_10k, area_m2, deal_type')
    .in('apartment_id', aptIds);
  const byApt = new Map();
  for (const t of trades ?? []) {
    if (t.deal_type === '직거래') continue;
    if (!t.area_m2 || t.area_m2 <= 0) continue;
    const ppy = calcPpy(t.price_10k, t.area_m2);
    if (!byApt.has(t.apartment_id)) byApt.set(t.apartment_id, []);
    byApt.get(t.apartment_id).push(ppy);
  }
  const aptAvgs = [...byApt.entries()]
    .filter(([, l]) => l.length >= 2)
    .map(([id, l]) => ({ id, avg: Math.round(l.reduce((s, x) => s + x, 0) / l.length) }))
    .sort((a, b) => b.avg - a.avg);
  if (aptAvgs.length === 0) continue;

  const median = aptAvgs[Math.floor(aptAvgs.length / 2)].avg;
  const p10 = aptAvgs[Math.floor(aptAvgs.length * 0.1)].avg;
  const p90 = aptAvgs[Math.floor(aptAvgs.length * 0.9)].avg;
  console.log(
    `  ${sggMap[sgg]}: ${aptAvgs.length}단지 분석 · 중앙값 ${median.toLocaleString()}만원/평 · ` +
      `p10 ${p10.toLocaleString()} / p90 ${p90.toLocaleString()}`
  );
  // Top 3 / Bottom 3
  const apts = new Map(list.map((a) => [a.id, a.name]));
  console.log(`    🥇 Top: ${aptAvgs.slice(0, 3).map((a) => `${apts.get(a.id)} ${a.avg.toLocaleString()}`).join(' | ')}`);
  console.log(`    🥉 Bot: ${aptAvgs.slice(-3).map((a) => `${apts.get(a.id)} ${a.avg.toLocaleString()}`).join(' | ')}`);
}

// ===== 4. 전세가율 계산 가능성 =====
console.log('\n▶ 4. 전세가율 계산 가능 단지 (같은 평형 매매+전세 둘 다)');

for (const [sgg, list] of sggDist) {
  if (sgg === '?????') continue;
  const aptIds = list.map((a) => a.id);

  const { data: trades } = await sb
    .from('trade_history')
    .select('apartment_id, area_m2, price_10k, deal_type')
    .in('apartment_id', aptIds);
  const { data: rents } = await sb
    .from('rent_history')
    .select('apartment_id, area_m2, deposit_10k, contract_type, deal_type')
    .in('apartment_id', aptIds);

  let possibleApts = 0;
  for (const aptId of aptIds) {
    const sales = (trades ?? []).filter(
      (t) => t.apartment_id === aptId && t.deal_type !== '직거래'
    );
    const jeonses = (rents ?? []).filter(
      (r) => r.apartment_id === aptId && r.contract_type === '전세' && r.deal_type !== '직거래' && r.deposit_10k > 0
    );
    if (sales.length === 0 || jeonses.length === 0) continue;
    // 같은 정수 m² 평형 교집합
    const saleAreas = new Set(sales.map((s) => Math.round(s.area_m2)));
    const jeonseAreas = new Set(jeonses.map((j) => Math.round(j.area_m2)));
    let overlap = 0;
    for (const a of saleAreas) if (jeonseAreas.has(a)) overlap++;
    if (overlap > 0) possibleApts++;
  }
  console.log(`  ${sggMap[sgg]}: ${possibleApts} / ${aptIds.length}단지 (${Math.round((possibleApts / aptIds.length) * 100)}%)`);
}

// ===== 5. 비교 추천 후보 분포 =====
console.log('\n▶ 5. 비교 추천 후보가 있는 단지 (시군구 내 ±30% 평당가 단지 2개 이상)');

let totalEligible = 0;
let totalSampled = 0;
for (const [sgg, list] of sggDist) {
  if (sgg === '?????') continue;
  const aptIds = list.map((a) => a.id);
  const { data: trades } = await sb
    .from('trade_history')
    .select('apartment_id, area_m2, price_10k, deal_type')
    .in('apartment_id', aptIds);

  const byApt = new Map();
  for (const t of trades ?? []) {
    if (t.deal_type === '직거래') continue;
    if (!t.area_m2 || t.area_m2 <= 0) continue;
    const ppy = calcPpy(t.price_10k, t.area_m2);
    if (!byApt.has(t.apartment_id)) byApt.set(t.apartment_id, []);
    byApt.get(t.apartment_id).push(ppy);
  }
  const aptAvg = new Map();
  for (const [id, l] of byApt.entries()) {
    if (l.length < 2) continue;
    aptAvg.set(id, Math.round(l.reduce((s, x) => s + x, 0) / l.length));
  }

  let eligible = 0;
  for (const [id, my] of aptAvg.entries()) {
    let count = 0;
    for (const [other, oavg] of aptAvg.entries()) {
      if (other === id) continue;
      const diffRatio = Math.abs(my - oavg) / my;
      if (diffRatio <= 0.30) count++;
    }
    if (count >= 2) eligible++;
  }
  totalEligible += eligible;
  totalSampled += aptAvg.size;
  console.log(`  ${sggMap[sgg]}: ${eligible} / ${aptAvg.size}단지가 비교 추천 후보 ≥ 2`);
}
console.log(`  · 전체: ${totalEligible} / ${totalSampled} (${Math.round(totalEligible / totalSampled * 100)}%)`);

// ===== 6. 초기비용 + 갭투자 시뮬 — 샘플 단지 5곳 결과 =====
console.log('\n▶ 6. 샘플 5단지 — 초기비용 + 갭 시뮬레이션');
const calcAcqTax = (p10k) => {
  const eok = p10k / 10000;
  if (eok <= 6) return Math.round(p10k * 0.01);
  if (eok <= 9) return Math.round(p10k * (eok * (2 / 3) - 3) / 100);
  return Math.round(p10k * 0.03);
};
const calcBroker = (p10k) => {
  const eok = p10k / 10000;
  let r = 0.004;
  if (eok >= 9) r = 0.005;
  if (eok >= 12) r = 0.006;
  if (eok >= 15) r = 0.007;
  return Math.round(p10k * r);
};
const fmtMan = (m) => m >= 10000 ? `${Math.floor(m / 10000)}억${m % 10000 > 0 ? ` ${(m % 10000).toLocaleString()}만` : ''}` : `${m.toLocaleString()}만`;

const sampleNames = ['여의도시범아파트', '아크로서울포레스트', '성수롯데캐슬', '마포래미안푸르지오', '여의도자이'];
for (const name of sampleNames) {
  const { data: apt } = await sb.from('apartments').select('id, name, total_units').ilike('name', `%${name.slice(0, 3)}%`).limit(1).maybeSingle();
  if (!apt) { console.log(`  · ${name}: 단지 없음`); continue; }

  const { data: tr } = await sb.from('trade_history')
    .select('price_10k, area_m2, deal_type')
    .eq('apartment_id', apt.id);
  const market = (tr ?? []).filter((t) => t.deal_type !== '직거래' && t.area_m2);
  if (market.length === 0) { console.log(`  · ${apt.name}: 거래 없음`); continue; }
  const avgPrice = Math.round(market.reduce((s, t) => s + t.price_10k, 0) / market.length);
  const tax = calcAcqTax(avgPrice);
  const brk = calcBroker(avgPrice);

  const { data: rt } = await sb.from('rent_history')
    .select('deposit_10k, contract_type, deal_type, area_m2')
    .eq('apartment_id', apt.id);
  const jeonses = (rt ?? []).filter((r) => r.contract_type === '전세' && r.deal_type !== '직거래' && r.deposit_10k > 0);
  const avgJeonse = jeonses.length > 0 ? Math.round(jeonses.reduce((s, r) => s + r.deposit_10k, 0) / jeonses.length) : null;
  const gap = avgJeonse ? avgPrice - avgJeonse : null;

  console.log(`  · ${apt.name.padEnd(20)} 매매 ${fmtMan(avgPrice)} | 취득세 ${fmtMan(tax)} | 중개비 ${fmtMan(brk)} | 갭 ${gap !== null ? fmtMan(gap) : '-'}`);
}

console.log('\n=== 백테스팅 완료 ===');
