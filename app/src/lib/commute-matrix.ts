// 행정구 × 주요 업무권역(CBD) 대중교통 소요시간 매트릭스
// 정확한 소요시간은 Kakao Mobility API나 실시간 교통 API가 필요하지만,
// 비용 0으로 대략적인 참고값을 제공하기 위해 수동 큐레이션한 매트릭스를 사용한다.
// 사용자에게는 "참고 기준 수치이며 실제 시간대에 따라 달라질 수 있어요"로 고지.

import type { CommuteArea } from '@/types/profile';

export interface CommuteEstimate {
  minMinutes: number;
  maxMinutes: number;
  transferCount: number;
  verdict: '최적' | '편리' | '보통' | '불편';
  description: string;
}

// 주요 CBD 6개
export const MAIN_CBDS: CommuteArea[] = [
  'gangnam',
  'yeouido',
  'gwanghwamun',
  'pangyo',
  'jamsil',
  'seongsu',
];

export const CBD_LABELS: Record<CommuteArea, string> = {
  gangnam: '강남·삼성',
  yeouido: '여의도',
  gwanghwamun: '광화문·종로',
  pangyo: '판교',
  jamsil: '잠실',
  seongsu: '성수',
  etc: '그 외',
  none: '-',
};

const MATRIX: Record<string, Partial<Record<CommuteArea, CommuteEstimate>>> = {
  송파구: {
    gangnam: { minMinutes: 15, maxMinutes: 30, transferCount: 0, verdict: '편리', description: '2호선/8호선 환승 한 번으로 20분대 가능' },
    jamsil: { minMinutes: 5, maxMinutes: 15, transferCount: 0, verdict: '최적', description: '잠실 직결 생활권' },
    yeouido: { minMinutes: 35, maxMinutes: 55, transferCount: 1, verdict: '보통', description: '2호선 환승으로 45분 내외' },
    gwanghwamun: { minMinutes: 30, maxMinutes: 50, transferCount: 1, verdict: '보통', description: '2호선→5호선 환승' },
    pangyo: { minMinutes: 25, maxMinutes: 40, transferCount: 0, verdict: '편리', description: '8호선→신분당선 환승 또는 자차' },
    seongsu: { minMinutes: 20, maxMinutes: 35, transferCount: 0, verdict: '편리', description: '2호선 직결' },
  },
  강남구: {
    gangnam: { minMinutes: 5, maxMinutes: 15, transferCount: 0, verdict: '최적', description: '구 내부 이동' },
    jamsil: { minMinutes: 10, maxMinutes: 20, transferCount: 0, verdict: '편리', description: '2호선 직결' },
    yeouido: { minMinutes: 25, maxMinutes: 40, transferCount: 0, verdict: '편리', description: '9호선 직결' },
    gwanghwamun: { minMinutes: 25, maxMinutes: 45, transferCount: 1, verdict: '보통', description: '3호선→5호선 환승' },
    pangyo: { minMinutes: 20, maxMinutes: 35, transferCount: 0, verdict: '편리', description: '신분당선 직결' },
    seongsu: { minMinutes: 15, maxMinutes: 25, transferCount: 0, verdict: '편리', description: '2호선 직결' },
  },
  서초구: {
    gangnam: { minMinutes: 5, maxMinutes: 20, transferCount: 0, verdict: '최적', description: '3호선/9호선 직결' },
    pangyo: { minMinutes: 20, maxMinutes: 35, transferCount: 0, verdict: '편리', description: '신분당선 직결' },
    yeouido: { minMinutes: 25, maxMinutes: 40, transferCount: 0, verdict: '편리', description: '9호선 한 번으로' },
    gwanghwamun: { minMinutes: 30, maxMinutes: 50, transferCount: 1, verdict: '보통', description: '환승 1회 포함' },
    jamsil: { minMinutes: 20, maxMinutes: 35, transferCount: 1, verdict: '편리', description: '2호선 환승' },
    seongsu: { minMinutes: 25, maxMinutes: 40, transferCount: 1, verdict: '보통', description: '환승 1회' },
  },
  마포구: {
    yeouido: { minMinutes: 10, maxMinutes: 20, transferCount: 0, verdict: '최적', description: '5호선 직결' },
    gwanghwamun: { minMinutes: 10, maxMinutes: 25, transferCount: 0, verdict: '최적', description: '5호선 직결' },
    gangnam: { minMinutes: 30, maxMinutes: 45, transferCount: 1, verdict: '보통', description: '환승 1회 포함' },
    jamsil: { minMinutes: 35, maxMinutes: 50, transferCount: 1, verdict: '보통', description: '2호선 환승' },
    seongsu: { minMinutes: 20, maxMinutes: 35, transferCount: 0, verdict: '편리', description: '6호선 직결' },
    pangyo: { minMinutes: 45, maxMinutes: 65, transferCount: 2, verdict: '불편', description: '환승 2회 필요' },
  },
  영등포구: {
    yeouido: { minMinutes: 5, maxMinutes: 15, transferCount: 0, verdict: '최적', description: '도보 + 5분' },
    gwanghwamun: { minMinutes: 25, maxMinutes: 40, transferCount: 0, verdict: '편리', description: '5호선 직결' },
    gangnam: { minMinutes: 30, maxMinutes: 45, transferCount: 0, verdict: '편리', description: '9호선 직결' },
    jamsil: { minMinutes: 35, maxMinutes: 55, transferCount: 1, verdict: '보통', description: '환승 1회' },
    pangyo: { minMinutes: 40, maxMinutes: 60, transferCount: 1, verdict: '보통', description: '신분당선 환승' },
    seongsu: { minMinutes: 30, maxMinutes: 45, transferCount: 1, verdict: '보통', description: '2호선 환승' },
  },
  양천구: {
    yeouido: { minMinutes: 15, maxMinutes: 30, transferCount: 0, verdict: '편리', description: '5호선 직결' },
    gwanghwamun: { minMinutes: 30, maxMinutes: 45, transferCount: 0, verdict: '편리', description: '5호선 한 번으로' },
    gangnam: { minMinutes: 40, maxMinutes: 60, transferCount: 1, verdict: '보통', description: '환승 1회 + 시간 소요' },
    jamsil: { minMinutes: 45, maxMinutes: 65, transferCount: 1, verdict: '불편', description: '환승 + 거리' },
    pangyo: { minMinutes: 50, maxMinutes: 70, transferCount: 2, verdict: '불편', description: '환승 2회' },
    seongsu: { minMinutes: 35, maxMinutes: 50, transferCount: 1, verdict: '보통', description: '환승 1회' },
  },
  성동구: {
    seongsu: { minMinutes: 5, maxMinutes: 15, transferCount: 0, verdict: '최적', description: '구 내부 이동' },
    gangnam: { minMinutes: 15, maxMinutes: 30, transferCount: 0, verdict: '편리', description: '2호선/분당선 직결' },
    jamsil: { minMinutes: 15, maxMinutes: 25, transferCount: 0, verdict: '편리', description: '2호선 직결' },
    gwanghwamun: { minMinutes: 15, maxMinutes: 30, transferCount: 0, verdict: '편리', description: '5호선 또는 2호선 환승' },
    yeouido: { minMinutes: 30, maxMinutes: 45, transferCount: 1, verdict: '보통', description: '5호선 환승' },
    pangyo: { minMinutes: 35, maxMinutes: 55, transferCount: 1, verdict: '보통', description: '환승 1회' },
  },
  동작구: {
    yeouido: { minMinutes: 3, maxMinutes: 10, transferCount: 0, verdict: '최적', description: '9호선 1정거장 (노량진→여의도)' },
    gangnam: { minMinutes: 20, maxMinutes: 35, transferCount: 0, verdict: '편리', description: '9호선 급행 직결' },
    gwanghwamun: { minMinutes: 15, maxMinutes: 30, transferCount: 0, verdict: '편리', description: '1호선 직결' },
    jamsil: { minMinutes: 30, maxMinutes: 45, transferCount: 1, verdict: '보통', description: '2호선 환승' },
    pangyo: { minMinutes: 35, maxMinutes: 50, transferCount: 1, verdict: '보통', description: '신분당선 환승' },
    seongsu: { minMinutes: 25, maxMinutes: 40, transferCount: 1, verdict: '보통', description: '2호선 환승' },
  },
};

export function estimateCommute(
  district: string,
  commuteArea: CommuteArea | undefined
): CommuteEstimate | null {
  if (!commuteArea || commuteArea === 'none' || commuteArea === 'etc') return null;
  return MATRIX[district]?.[commuteArea] ?? null;
}

/**
 * estimateCommute의 비동기 + DB 우선 버전. region_code 기반 정확 매칭.
 * 코드 MATRIX만 보던 동기 버전이 새 권역(은평구 등)을 누락하던 문제 해결.
 */
export async function estimateCommuteByCodeAsync(
  regionCode: string | null | undefined,
  district: string,
  commuteArea: CommuteArea | undefined
): Promise<CommuteEstimate | null> {
  if (!commuteArea || commuteArea === 'none' || commuteArea === 'etc') return null;

  // 1) DB region_code 우선
  if (regionCode) {
    try {
      const supabase = createSupabaseAdminClient();
      const { data } = await supabase
        .from('region_commute')
        .select('min_minutes, max_minutes, transfer_count, verdict, description')
        .eq('region_code', regionCode)
        .eq('commute_area', commuteArea)
        .maybeSingle();
      if (data) {
        return {
          minMinutes: (data as { min_minutes: number }).min_minutes,
          maxMinutes: (data as { max_minutes: number }).max_minutes,
          transferCount: (data as { transfer_count: number }).transfer_count,
          verdict: (data as { verdict: CommuteEstimate['verdict'] }).verdict,
          description: (data as { description: string }).description,
        };
      }
    } catch {
      // DB 실패 → 이름 기반 fallback
    }
  }

  // 2) DB district_name fallback
  try {
    const supabase = createSupabaseAdminClient();
    const { data } = await supabase
      .from('region_commute')
      .select('min_minutes, max_minutes, transfer_count, verdict, description')
      .eq('district_name', district)
      .eq('commute_area', commuteArea)
      .limit(1)
      .maybeSingle();
    if (data) {
      return {
        minMinutes: (data as { min_minutes: number }).min_minutes,
        maxMinutes: (data as { max_minutes: number }).max_minutes,
        transferCount: (data as { transfer_count: number }).transfer_count,
        verdict: (data as { verdict: CommuteEstimate['verdict'] }).verdict,
        description: (data as { description: string }).description,
      };
    }
  } catch {
    // 무시
  }

  // 3) 코드 MATRIX 최종 fallback
  return MATRIX[district]?.[commuteArea] ?? null;
}

export function getCommuteGrid(district: string): Array<{
  area: CommuteArea;
  label: string;
  estimate: CommuteEstimate | null;
}> {
  return MAIN_CBDS.map((area) => ({
    area,
    label: CBD_LABELS[area],
    estimate: MATRIX[district]?.[area] ?? null,
  }));
}

// DB 우선 조회 (서버 컴포넌트에서 사용). 매트릭스 미스 시 코드 fallback.
import { createSupabaseAdminClient } from './supabase/server';

export async function getCommuteGridAsync(district: string): Promise<
  Array<{ area: CommuteArea; label: string; estimate: CommuteEstimate | null }>
> {
  // DB 한 번에 조회
  let dbMap: Partial<Record<CommuteArea, CommuteEstimate>> = {};
  try {
    const supabase = createSupabaseAdminClient();
    const { data } = await supabase
      .from('region_commute')
      .select('commute_area, min_minutes, max_minutes, transfer_count, verdict, description')
      .eq('district_name', district);

    for (const row of data ?? []) {
      const v = (row as { verdict: string }).verdict as CommuteEstimate['verdict'];
      dbMap[(row as { commute_area: CommuteArea }).commute_area] = {
        minMinutes: (row as { min_minutes: number }).min_minutes,
        maxMinutes: (row as { max_minutes: number }).max_minutes,
        transferCount: (row as { transfer_count: number }).transfer_count,
        verdict: v,
        description: (row as { description: string }).description,
      };
    }
  } catch {
    // DB 실패 → 코드 fallback
    dbMap = {};
  }

  return MAIN_CBDS.map((area) => ({
    area,
    label: CBD_LABELS[area],
    estimate: dbMap[area] ?? MATRIX[district]?.[area] ?? null,
  }));
}

/**
 * region_code(시군구 5자리) 우선 매칭. 같은 이름의 자치구가 여러 광역시에 존재할 때 충돌 회피.
 * region_code 미스 시 district_name 기반 fallback.
 */
export async function getCommuteGridByCodeAsync(
  regionCode: string | null | undefined,
  districtFallback: string
): Promise<Array<{ area: CommuteArea; label: string; estimate: CommuteEstimate | null }>> {
  if (!regionCode) {
    return getCommuteGridAsync(districtFallback);
  }

  let dbMap: Partial<Record<CommuteArea, CommuteEstimate>> = {};
  try {
    const supabase = createSupabaseAdminClient();
    const { data } = await supabase
      .from('region_commute')
      .select('commute_area, min_minutes, max_minutes, transfer_count, verdict, description')
      .eq('region_code', regionCode);

    for (const row of data ?? []) {
      const v = (row as { verdict: string }).verdict as CommuteEstimate['verdict'];
      dbMap[(row as { commute_area: CommuteArea }).commute_area] = {
        minMinutes: (row as { min_minutes: number }).min_minutes,
        maxMinutes: (row as { max_minutes: number }).max_minutes,
        transferCount: (row as { transfer_count: number }).transfer_count,
        verdict: v,
        description: (row as { description: string }).description,
      };
    }
  } catch {
    dbMap = {};
  }

  // DB hit이 하나라도 있으면 그것만 사용. 전혀 없으면 이름 fallback.
  if (Object.keys(dbMap).length === 0) {
    return getCommuteGridAsync(districtFallback);
  }

  return MAIN_CBDS.map((area) => ({
    area,
    label: CBD_LABELS[area],
    estimate: dbMap[area] ?? MATRIX[districtFallback]?.[area] ?? null,
  }));
}

/**
 * 단지 좌표 기반 ODSay 실시간 매칭. 결과는 시군구 매트릭스보다 정밀.
 * - 단지 좌표 없음 → 매트릭스 fallback
 * - ODSay 결과 있음 → ODSay 사용 (출처 표기를 위해 source 필드 추가)
 * - ODSay 미응답(키 없음/실패/캐시미스 + 호출실패) → 시군구 매트릭스 fallback
 *
 * 캐시: transit_path_cache 테이블 (단지×CBD 영구 캐시). 같은 단지 재조회는 무료.
 */
import { getTransitPath, CBD_COORDS } from './transit-path';
import { LINE_COLOR } from './subway-paths';

export interface ApartmentCommuteEstimate extends CommuteEstimate {
  source: 'odsay' | 'matrix' | 'none';
  hops?: { firstStation: string | null; lastStation: string | null };
}

function odsayPathToEstimate(p: {
  totalTimeMin: number;
  transitCount: number;
  hops: Array<{ rideLine?: string }>;
  firstStation: string | null;
  lastStation: string | null;
}): ApartmentCommuteEstimate {
  const total = p.totalTimeMin;
  const transfers = p.transitCount;
  // 약간의 변동 흡수 — ODSay 단일 추정값을 ±5/+10 폭으로 노출
  const minMinutes = Math.max(5, Math.round(total - 5));
  const maxMinutes = Math.round(total + 10);

  // verdict 자동 판정
  let verdict: CommuteEstimate['verdict'];
  if (total <= 30 && transfers === 0) verdict = '최적';
  else if (total <= 45 && transfers <= 1) verdict = '편리';
  else if (total <= 60) verdict = '보통';
  else verdict = '불편';

  // description 생성 — 첫 라이드 호선 + 환승 횟수
  const rideLines = p.hops
    .map((h) => h.rideLine)
    .filter((l): l is string => Boolean(l));
  const lineLabels = rideLines.map((l) => (LINE_COLOR as Record<string, { label: string }>)[l]?.label ?? l);
  let description: string;
  if (lineLabels.length === 0) {
    description = `약 ${total}분 (${p.firstStation ?? '근처 역'}→${p.lastStation ?? '도착'})`;
  } else if (transfers === 0) {
    description = `${lineLabels[0]}호선 직결 (약 ${total}분)`;
  } else {
    description = `${lineLabels.slice(0, 3).join('→')} 환승 ${transfers}회 (약 ${total}분)`;
  }

  return {
    minMinutes,
    maxMinutes,
    transferCount: transfers,
    verdict,
    description,
    source: 'odsay',
    hops: { firstStation: p.firstStation, lastStation: p.lastStation },
  };
}

/**
 * 단지 단위 commute grid. 6 CBD 모두 ODSay로 시도하고, 실패한 항목만 매트릭스 fallback.
 */
export async function getApartmentCommuteGridAsync(
  apartmentId: string,
  origin: { lat: number; lng: number } | null,
  regionCode: string | null | undefined,
  districtFallback: string
): Promise<Array<{ area: CommuteArea; label: string; estimate: ApartmentCommuteEstimate | null }>> {
  // 매트릭스 결과 먼저 fetch (fallback 베이스)
  const matrixGrid = await getCommuteGridByCodeAsync(regionCode, districtFallback);
  const matrixMap: Partial<Record<CommuteArea, CommuteEstimate>> = {};
  for (const g of matrixGrid) if (g.estimate) matrixMap[g.area] = g.estimate;

  // 좌표 없으면 매트릭스만
  if (!origin) {
    return matrixGrid.map((g) => ({
      area: g.area,
      label: g.label,
      estimate: g.estimate ? { ...g.estimate, source: 'matrix' as const } : null,
    }));
  }

  // 6 CBD 병렬 ODSay 호출 (캐시 hit이면 무료)
  const odsayResults = await Promise.all(
    MAIN_CBDS.map(async (area) => {
      const dest = CBD_COORDS[area];
      if (!dest) return { area, path: null };
      try {
        const path = await getTransitPath(apartmentId, origin, area, dest);
        return { area, path };
      } catch {
        return { area, path: null };
      }
    })
  );

  return MAIN_CBDS.map((area) => {
    const odsay = odsayResults.find((r) => r.area === area)?.path;
    let estimate: ApartmentCommuteEstimate | null = null;
    if (odsay) {
      estimate = odsayPathToEstimate(odsay);
    } else if (matrixMap[area]) {
      estimate = { ...matrixMap[area]!, source: 'matrix' };
    }
    return { area, label: CBD_LABELS[area], estimate };
  });
}

export function getVerdictColor(verdict: CommuteEstimate['verdict']): string {
  switch (verdict) {
    case '최적':
      return 'bg-success-soft text-success border-success/30';
    case '편리':
      return 'bg-primary-soft text-primary border-primary/30';
    case '보통':
      return 'bg-warning-soft text-warning border-warning/30';
    case '불편':
      return 'bg-danger-soft text-danger border-danger/30';
  }
}
