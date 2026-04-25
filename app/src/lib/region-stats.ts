// 권역(동·구) 평균 평당가 계산 — 단지별 평당가를 권역 내에서 비교.
// "이 단지는 여의도동 평균 대비 +12%" 같은 객관적 위치 정보 제공.
//
// 계산 단위: 동(dong_code 10자리). 동 표본이 적으면 시군구(앞 5자리) fallback.

import { calcPricePerPyeong } from './utils';
import type { TradePoint } from '@/types/apartment';
import { createSupabaseAdminClient } from './supabase/server';

export interface RegionPercentileResult {
  scope: 'dong' | 'sgg'; // 동 vs 시군구
  scopeLabel: string;    // "여의도동" 또는 "영등포구"
  apartmentAvg: number;  // 이 단지 평형 A 평균 평당가
  regionAvg: number;     // 권역 평균 평당가
  diffPct: number;       // (단지 - 권역) / 권역 × 100
  sampleSize: number;    // 권역 표본 단지 수
  rank?: number;         // 권역 내 평당가 순위 (1=최고가)
  totalApts?: number;    // 권역 단지 총수
}

interface AptStat {
  apartmentId: string;
  pricePerPyeong: number;
}

/**
 * 단지의 평당가를 같은 동/구 평균과 비교.
 * 직거래 제외, 공급면적 기준 평당가.
 */
export async function calcRegionPercentile(
  apartmentId: string,
  apartmentDongCode: string | null,
  apartmentTrades: TradePoint[]
): Promise<RegionPercentileResult | null> {
  if (!apartmentDongCode) return null;

  // 이 단지의 평균 평당가 (직거래 제외)
  const market = apartmentTrades.filter((t) => t.dealType !== '직거래');
  if (market.length === 0) return null;

  const apartmentAvg = Math.round(
    market.reduce((s, t) => s + calcPricePerPyeong(t.priceM10k, t.areaM2), 0) /
      market.length
  );

  const supabase = createSupabaseAdminClient();

  // 1차: 같은 동(dong_code 10자리) 모든 단지 trades 조회
  const dongAptIds = await fetchAptsByCodePrefix(supabase, apartmentDongCode);
  let scope: 'dong' | 'sgg' = 'dong';
  let scopeLabel = '동';
  let aptIds = dongAptIds;

  // 동 표본이 5개 미만이면 시군구로 확장
  if (aptIds.length < 5) {
    const sggCode = apartmentDongCode.slice(0, 5);
    aptIds = await fetchAptsByCodePrefix(supabase, sggCode);
    scope = 'sgg';
    scopeLabel = '시군구';
  }

  if (aptIds.length < 3) return null;

  // 권역 단지의 평당가 평균 계산
  const stats = await fetchAptAverages(supabase, aptIds);
  if (stats.length < 3) return null;

  const regionAvg = Math.round(
    stats.reduce((s, x) => s + x.pricePerPyeong, 0) / stats.length
  );

  if (regionAvg <= 0) return null;

  const diffPct = Math.round(((apartmentAvg - regionAvg) / regionAvg) * 1000) / 10;

  // 권역 내 순위 (높은 순)
  const sorted = stats.slice().sort((a, b) => b.pricePerPyeong - a.pricePerPyeong);
  const rank = sorted.findIndex((s) => s.apartmentId === apartmentId) + 1;

  // 권역 라벨을 사람 읽기 좋게 — 단지 주소에서 추출하면 정확하지만 단순화
  // dong_code 표기는 "여의도동" 같은 한글이 아니라 숫자라, region 이름은 추가 매핑 필요.
  // 현 시점엔 sgg 단위 매핑만:
  // 서울 25개 자치구 라벨
  const sggMap: Record<string, string> = {
    '11110': '종로구', '11140': '중구', '11170': '용산구',
    '11200': '성동구', '11215': '광진구', '11230': '동대문구',
    '11260': '중랑구', '11290': '성북구', '11305': '강북구',
    '11320': '도봉구', '11350': '노원구', '11380': '은평구',
    '11410': '서대문구', '11440': '마포구', '11470': '양천구',
    '11500': '강서구', '11530': '구로구', '11545': '금천구',
    '11560': '영등포구', '11590': '동작구', '11620': '관악구',
    '11650': '서초구', '11680': '강남구', '11710': '송파구',
    '11740': '강동구',
  };
  const sggCode = apartmentDongCode.slice(0, 5);
  const finalLabel = sggMap[sggCode] ?? '인근 권역';

  return {
    scope,
    scopeLabel: finalLabel,
    apartmentAvg,
    regionAvg,
    diffPct,
    sampleSize: stats.length,
    rank: rank > 0 ? rank : undefined,
    totalApts: stats.length,
  };
}

async function fetchAptsByCodePrefix(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  prefix: string
): Promise<string[]> {
  const { data } = await supabase
    .from('apartments')
    .select('id')
    .like('dong_code', `${prefix}%`);
  return (data ?? []).map((d) => d.id);
}

async function fetchAptAverages(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  aptIds: string[]
): Promise<AptStat[]> {
  if (aptIds.length === 0) return [];
  // 단지별 12개월 거래 평균 평당가 (직거래 제외)
  const { data } = await supabase
    .from('trade_history')
    .select('apartment_id, price_10k, area_m2, deal_type')
    .in('apartment_id', aptIds);

  if (!data || data.length === 0) return [];

  const byApt = new Map<string, number[]>();
  for (const t of data) {
    if (t.deal_type === '직거래') continue;
    if (!t.area_m2 || t.area_m2 <= 0) continue;
    const ppy = calcPricePerPyeong(t.price_10k, t.area_m2);
    if (!byApt.has(t.apartment_id)) byApt.set(t.apartment_id, []);
    byApt.get(t.apartment_id)!.push(ppy);
  }

  const result: AptStat[] = [];
  for (const [id, list] of byApt.entries()) {
    if (list.length < 2) continue; // 표본 너무 적은 단지 제외
    const avg = Math.round(list.reduce((s, x) => s + x, 0) / list.length);
    result.push({ apartmentId: id, pricePerPyeong: avg });
  }
  return result;
}
