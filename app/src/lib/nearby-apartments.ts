// 주변 대단지 조회 — Haversine 거리 기반
// 같은 구 내 / 반경 3km 내 / 1,500세대 이상 필터
// 각 단지의 최근 실거래가도 함께 조회해 평당가 계산

import { createSupabaseAdminClient } from './supabase/server';
import { calcPricePerPyeong } from './utils';

export interface NearbyApartment {
  id: string;
  name: string;
  address: string;
  totalUnits: number;
  builtYear: number | null;
  latitude: number | null;
  longitude: number | null;
  distanceKm: number;
  latestPrice10k?: number;
  latestAreaM2?: number;
  pricePerPyeong?: number; // 만원/평
}

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function findNearbyLargeApartments(
  currentId: string,
  currentLat: number,
  currentLng: number,
  options: {
    radiusKm?: number;
    minUnits?: number;
    limit?: number;
  } = {}
): Promise<NearbyApartment[]> {
  const radiusKm = options.radiusKm ?? 3;
  const minUnits = options.minUnits ?? 1500;
  const limit = options.limit ?? 5;

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('apartments')
    .select('id, name, address, total_units, built_year, latitude, longitude')
    .neq('id', currentId)
    .gte('total_units', minUnits);

  if (error || !data) return [];

  const candidates = data
    .filter((row) => row.latitude !== null && row.longitude !== null)
    .map((row) => ({
      id: row.id,
      name: row.name,
      address: row.address,
      totalUnits: row.total_units ?? 0,
      builtYear: row.built_year ?? null,
      latitude: row.latitude,
      longitude: row.longitude,
      distanceKm: haversineKm(
        currentLat,
        currentLng,
        row.latitude!,
        row.longitude!
      ),
    }))
    .filter((row) => row.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);

  if (candidates.length === 0) return [];

  // 각 단지의 최근 실거래가 조회 (단일 쿼리 + 그룹핑)
  const ids = candidates.map((c) => c.id);
  const { data: trades } = await supabase
    .from('trade_history')
    .select('apartment_id, price_10k, area_m2, deal_date')
    .in('apartment_id', ids)
    .order('deal_date', { ascending: false });

  const latestByApt = new Map<string, { price: number; area: number }>();
  for (const t of trades ?? []) {
    if (!latestByApt.has(t.apartment_id)) {
      latestByApt.set(t.apartment_id, {
        price: t.price_10k,
        area: t.area_m2,
      });
    }
  }

  return candidates.map((c) => {
    const latest = latestByApt.get(c.id);
    const ppy = latest ? calcPricePerPyeong(latest.price, latest.area) : undefined;
    return {
      ...c,
      latestPrice10k: latest?.price,
      latestAreaM2: latest?.area,
      pricePerPyeong: ppy,
    };
  });
}
