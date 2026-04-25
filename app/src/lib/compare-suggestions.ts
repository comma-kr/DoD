// "비교하기 좋은 단지 2곳" 추천 — 같은 권역 + 비슷한 가격대 단지에서.
// 클릭 시 비교 페이지로 prefilled 진입하여 990원 결제 자연 흐름.

import { calcPricePerPyeong } from './utils';
import { createSupabaseAdminClient } from './supabase/server';

export interface CompareSuggestion {
  id: string;
  name: string;
  address: string;
  totalUnits: number | null;
  builtYear: number | null;
  nearestStation: string | null;
  stationDistanceM: number | null;
  avgPricePerPyeong: number | null;
  latestPriceM10k: number | null;
  reason: string; // 추천 이유 한 줄
}

/**
 * 같은 시군구에서 평당가가 가까운 순으로 단지 2곳 추천.
 * 본 단지의 평형 A 평당가를 기준 → 시군구 내에서 ±20% 이내 단지 중 가까운 거 2개.
 */
export async function fetchCompareSuggestions(
  apartmentId: string,
  apartmentDongCode: string | null,
  apartmentAvgPricePerPyeong: number
): Promise<CompareSuggestion[]> {
  if (!apartmentDongCode || apartmentAvgPricePerPyeong <= 0) return [];

  const supabase = createSupabaseAdminClient();
  const sggCode = apartmentDongCode.slice(0, 5);

  // 같은 시군구 단지들
  const { data: peers } = await supabase
    .from('apartments')
    .select('id, name, address, total_units, built_year, nearest_station, station_distance_m')
    .like('dong_code', `${sggCode}%`)
    .neq('id', apartmentId);

  if (!peers || peers.length === 0) return [];

  // 단지별 거래 평균 평당가
  const peerIds = peers.map((p) => p.id);
  const { data: trades } = await supabase
    .from('trade_history')
    .select('apartment_id, price_10k, area_m2, deal_date, deal_type')
    .in('apartment_id', peerIds);

  const byApt = new Map<string, { ppy: number[]; latest: { p: number; date: string } | null }>();
  for (const t of trades ?? []) {
    if (t.deal_type === '직거래') continue;
    if (!t.area_m2 || t.area_m2 <= 0) continue;
    const ppy = calcPricePerPyeong(t.price_10k, t.area_m2);
    if (!byApt.has(t.apartment_id)) byApt.set(t.apartment_id, { ppy: [], latest: null });
    const slot = byApt.get(t.apartment_id)!;
    slot.ppy.push(ppy);
    if (!slot.latest || t.deal_date > slot.latest.date) {
      slot.latest = { p: t.price_10k, date: t.deal_date };
    }
  }

  // 후보 점수: 평당가 차이 비율 + 단지 규모 보너스
  const candidates = peers
    .map((p) => {
      const slot = byApt.get(p.id);
      if (!slot || slot.ppy.length < 2) return null; // 표본 너무 적은 단지 제외
      const avg = Math.round(slot.ppy.reduce((s, x) => s + x, 0) / slot.ppy.length);
      const diff = Math.abs(avg - apartmentAvgPricePerPyeong);
      const diffRatio = diff / apartmentAvgPricePerPyeong;
      if (diffRatio > 0.30) return null; // ±30% 초과는 제외
      return {
        peer: p,
        avg,
        latestPriceM10k: slot.latest?.p ?? null,
        diffRatio,
        // 추천 점수: 평당가 가까움 + 1000세대 이상 가산점
        score: diffRatio - ((p.total_units ?? 0) >= 1000 ? 0.05 : 0),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => a.score - b.score)
    .slice(0, 2);

  return candidates.map((c) => {
    const sign = c.avg > apartmentAvgPricePerPyeong ? '+' : c.avg < apartmentAvgPricePerPyeong ? '-' : '';
    const pct = Math.round(c.diffRatio * 100);
    const reason = `같은 시군구 · 평당가 ${sign}${pct}% 차이${
      (c.peer.total_units ?? 0) >= 1500 ? ' · 대단지' : ''
    }`;
    return {
      id: c.peer.id,
      name: c.peer.name,
      address: c.peer.address,
      totalUnits: c.peer.total_units,
      builtYear: c.peer.built_year,
      nearestStation: c.peer.nearest_station,
      stationDistanceM: c.peer.station_distance_m,
      avgPricePerPyeong: c.avg,
      latestPriceM10k: c.latestPriceM10k,
      reason,
    };
  });
}
