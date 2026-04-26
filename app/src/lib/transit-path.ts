// transit_path_cache 테이블을 통한 ODSay 호출 캐시 래퍼.
// 단지 × 출근지 페어로 1회만 호출. 무한 보관 (지하철 노선 거의 안 바뀜).
//
// 호출 부하 보호:
// - 키 없거나 ODSay 실패 → null 반환 (호출부에서 하드코딩 매트릭스 fallback)
// - DB 캐시 미스 시에만 ODSay 호출
// - upsert 실패해도 path는 반환 (사용자에겐 1회 보여주고 다음번 다시 호출)

import { createSupabaseAdminClient } from './supabase/server';
import { fetchTransitPaths } from './odsay-transit';
import type { CommuteArea } from '@/types/profile';
import type { SubwayHop } from './subway-paths';

// 캐시 raw_path 안에 alternatives까지 묶어 보관 (jsonb 한 칸).
interface CachedAltPath {
  totalTimeMin: number;
  transitCount: number;
  firstStation: string | null;
  lastStation: string | null;
  walkToFirstMin: number;
  walkFromLastMin: number;
  hops: SubwayHop[];
  pathType: number; // 1=지하철 / 2=버스 / 3=혼합
}

interface CachedRow {
  total_time_min: number;
  total_walk_m: number | null;
  payment_won: number | null;
  transit_count: number;
  first_station: string | null;
  last_station: string | null;
  raw_path: {
    hops: SubwayHop[];
    walkToFirstMin?: number;
    walkFromLastMin?: number;
    alternatives?: CachedAltPath[];
  } | null;
}

export interface TransitAlternative {
  totalTimeMin: number;
  transitCount: number;
  hops: SubwayHop[];
  firstStation: string | null;
  lastStation: string | null;
  walkToFirstMin: number;
  walkFromLastMin: number;
  pathType: number;
}

export interface TransitPath {
  totalTimeMin: number;
  totalWalkM: number;
  paymentWon: number;
  transitCount: number;
  hops: SubwayHop[];
  firstStation: string | null;
  lastStation: string | null;
  walkToFirstMin: number;
  walkFromLastMin: number;
  alternatives: TransitAlternative[]; // ODSay path[1~] — 다른 모드 대안
  fromCache: boolean;
}

/**
 * 단지 × 출근지에 대한 대중교통 경로를 반환.
 * 캐시 hit → 즉시 반환. miss → ODSay 호출 후 캐시 저장.
 *
 * @param apartmentId apartments.id
 * @param origin 단지 좌표
 * @param commuteArea CommuteArea (gangnam | yeouido | ...)
 * @param dest 출근지 대표 좌표 (CBD_COORDS)
 */
export async function getTransitPath(
  apartmentId: string,
  origin: { lat: number; lng: number },
  commuteArea: CommuteArea,
  dest: { lat: number; lng: number }
): Promise<TransitPath | null> {
  if (commuteArea === 'none' || commuteArea === 'etc') return null;

  const sb = createSupabaseAdminClient();

  // 1) 캐시 조회
  const cached = await sb
    .from('transit_path_cache')
    .select(
      'total_time_min, total_walk_m, payment_won, transit_count, first_station, last_station, raw_path'
    )
    .eq('apartment_id', apartmentId)
    .eq('commute_area', commuteArea)
    .maybeSingle();

  if (cached.data) {
    const row = cached.data as CachedRow;
    return {
      totalTimeMin: row.total_time_min,
      totalWalkM: row.total_walk_m ?? 0,
      paymentWon: row.payment_won ?? 0,
      transitCount: row.transit_count,
      hops: row.raw_path?.hops ?? [],
      firstStation: row.first_station,
      lastStation: row.last_station,
      walkToFirstMin: row.raw_path?.walkToFirstMin ?? 0,
      walkFromLastMin: row.raw_path?.walkFromLastMin ?? 0,
      alternatives: row.raw_path?.alternatives ?? [],
      fromCache: true,
    };
  }

  // 2) ODSay 호출 — primary + alternatives 한 번에
  const bundle = await fetchTransitPaths(origin, dest);
  if (!bundle) return null;
  const fresh = bundle.primary;
  const alts: CachedAltPath[] = bundle.alternatives.map((a) => ({
    totalTimeMin: a.totalTimeMin,
    transitCount: a.transitCount,
    firstStation: a.firstStation,
    lastStation: a.lastStation,
    walkToFirstMin: a.walkToFirstMin,
    walkFromLastMin: a.walkFromLastMin,
    hops: a.hops,
    pathType: a.pathType,
  }));

  // 3) 캐시 저장 (실패해도 path는 반환)
  try {
    await sb.from('transit_path_cache').upsert(
      {
        apartment_id: apartmentId,
        commute_area: commuteArea,
        total_time_min: fresh.totalTimeMin,
        total_walk_m: fresh.totalWalkM,
        payment_won: fresh.paymentWon,
        transit_count: fresh.transitCount,
        first_station: fresh.firstStation,
        last_station: fresh.lastStation,
        raw_path: {
          hops: fresh.hops,
          walkToFirstMin: fresh.walkToFirstMin,
          walkFromLastMin: fresh.walkFromLastMin,
          alternatives: alts,
        },
      },
      { onConflict: 'apartment_id,commute_area' }
    );
  } catch {
    // 캐시 저장 실패는 사용자 화면에 영향 없음
  }

  return {
    totalTimeMin: fresh.totalTimeMin,
    totalWalkM: fresh.totalWalkM,
    paymentWon: fresh.paymentWon,
    transitCount: fresh.transitCount,
    hops: fresh.hops,
    firstStation: fresh.firstStation,
    lastStation: fresh.lastStation,
    walkToFirstMin: fresh.walkToFirstMin,
    walkFromLastMin: fresh.walkFromLastMin,
    alternatives: alts,
    fromCache: false,
  };
}

// CBD 대표 좌표 — route-options.ts와 동기 유지 (단일 SSOT 필요 시 라이브러리화)
export const CBD_COORDS: Record<CommuteArea, { lat: number; lng: number } | null> = {
  gangnam: { lat: 37.4980, lng: 127.0276 },
  yeouido: { lat: 37.5216, lng: 126.9241 },
  gwanghwamun: { lat: 37.5700, lng: 126.9764 },
  pangyo: { lat: 37.3947, lng: 127.1112 },
  jamsil: { lat: 37.5133, lng: 127.1 },
  seongsu: { lat: 37.5447, lng: 127.0556 },
  etc: null,
  none: null,
};
