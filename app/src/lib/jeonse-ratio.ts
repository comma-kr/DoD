// 단지의 전세가율 계산 — "전세 보증금 / 매매가" 평균.
// 평형별 매칭(같은 정수 m² 버킷)을 우선해서 왜곡 방지 + 직거래 제외.
//
// 사용처: 임대비율 데이터가 공식 API에 없어서 대체 지표로 채택.
// 호갱노노/아실에서도 자주 보여주는 지표.

import type { TradePoint } from '@/types/apartment';
import { standardPrivateArea } from './utils';

export interface RentPoint {
  dealDate: string;
  depositM10k: number;        // 보증금 (만원)
  monthlyRentM10k: number;    // 월세 (만원). 전세 = 0.
  areaM2: number;
  contractType: '전세' | '월세' | null;
  dealType?: string | null;
}

export interface JeonseRatioResult {
  ratio: number;              // 0.50 = 50%
  pct: number;                // 50 (정수)
  saleAvg10k: number;         // 매매 평균 만원
  jeonseAvg10k: number;       // 전세 평균 만원
  saleN: number;              // 매매 표본 수
  jeonseN: number;            // 전세 표본 수
  areaM2: number;             // 사용된 평형
}

function isMarket<T extends { dealType?: string | null }>(t: T): boolean {
  return t.dealType !== '직거래';
}

// 같은 평형 내 매매 평균 / 전세 평균 → 전세가율
// 평형 매칭 우선순위: 거래수 가장 많은 평형 → 평균 보증금 / 평균 매매가
export function calcJeonseRatio(
  trades: TradePoint[],
  rents: RentPoint[]
): JeonseRatioResult | null {
  if (trades.length === 0 || rents.length === 0) return null;

  // 직거래 제외 + 전세만
  const saleMarket = trades.filter(isMarket);
  const jeonseMarket = rents.filter(
    (r) => isMarket(r) && r.contractType === '전세' && r.depositM10k > 0
  );

  if (saleMarket.length === 0 || jeonseMarket.length === 0) return null;

  // 평형 버킷 (정수 m²)
  const saleByArea = new Map<number, TradePoint[]>();
  for (const t of saleMarket) {
    const k = standardPrivateArea(t.areaM2);
    if (!saleByArea.has(k)) saleByArea.set(k, []);
    saleByArea.get(k)!.push(t);
  }
  const jeonseByArea = new Map<number, RentPoint[]>();
  for (const r of jeonseMarket) {
    const k = standardPrivateArea(r.areaM2);
    if (!jeonseByArea.has(k)) jeonseByArea.set(k, []);
    jeonseByArea.get(k)!.push(r);
  }

  // 매매·전세 모두 있는 평형 중 거래 합계가 가장 많은 평형 선택
  let bestArea: number | null = null;
  let bestScore = 0;
  for (const [area, sales] of saleByArea.entries()) {
    const jeonses = jeonseByArea.get(area);
    if (!jeonses || jeonses.length === 0) continue;
    const score = sales.length + jeonses.length;
    if (score > bestScore) {
      bestScore = score;
      bestArea = area;
    }
  }

  if (bestArea === null) return null;

  const sales = saleByArea.get(bestArea)!;
  const jeonses = jeonseByArea.get(bestArea)!;

  const saleAvg = Math.round(
    sales.reduce((s, t) => s + t.priceM10k, 0) / sales.length
  );
  const jeonseAvg = Math.round(
    jeonses.reduce((s, r) => s + r.depositM10k, 0) / jeonses.length
  );

  if (saleAvg <= 0) return null;

  const ratio = jeonseAvg / saleAvg;

  return {
    ratio,
    pct: Math.round(ratio * 100),
    saleAvg10k: saleAvg,
    jeonseAvg10k: jeonseAvg,
    saleN: sales.length,
    jeonseN: jeonses.length,
    areaM2: bestArea,
  };
}
