import { Home, Ruler, Users, Receipt, Wallet } from 'lucide-react';
import {
  calcPricePerPyeong,
  formatPrice10k,
  formatPricePerPyeong,
  typicalPublicPyeong,
} from '@/lib/utils';
import { CARD_TINT } from '@/lib/card-tint';
import type { TradePoint } from '@/types/apartment';
import type { JeonseRatioResult } from '@/lib/jeonse-ratio';

interface Props {
  trades: TradePoint[];
  totalUnits?: number | null;
  builtYear?: number | null;
  jeonseRatio?: JeonseRatioResult | null;
}

// 취득세율 (1주택자 기준, 2026년 시점)
// - 6억 이하: 1.0%, 6억~9억: 1~3% 누진, 9억 초과: 3%
function calcAcquisitionTax(price10k: number): number {
  const eok = price10k / 10000;
  if (eok <= 6) return Math.round(price10k * 0.01);
  if (eok <= 9) {
    // 6~9억 구간 누진: (가격 × 2/3억 - 3) / 100
    const rate = (eok * (2 / 3) - 3) / 100;
    return Math.round(price10k * rate);
  }
  return Math.round(price10k * 0.03);
}

// 부동산 중개 수수료 상한 (2024 개정)
// - 9억 미만: 0.4%, 9억~12억: 0.5%, 12억~15억: 0.6%, 15억 초과: 0.7%
function calcBrokerageFee(price10k: number): number {
  const eok = price10k / 10000;
  let rate: number;
  if (eok < 9) rate = 0.004;
  else if (eok < 12) rate = 0.005;
  else if (eok < 15) rate = 0.006;
  else rate = 0.007;
  return Math.round(price10k * rate);
}

interface AreaBucket {
  areaM2: number;
  trades: TradePoint[];
  avgPricePerPyeong: number;
}

// 직거래(가족간·증여성)는 시세 왜곡이라 평균 계산에서 제외 — 호갱노노·아실 표준
function isMarketTrade(t: TradePoint): boolean {
  return t.dealType !== '직거래';
}

// 거래를 정수 전용면적(㎡)으로 버킷팅 → Top 2 추출 + 평균 평당가
// (평형별 거래 빈도는 전체 trade로 카운트, 평당가 평균은 직거래 제외 후 산정)
function topAreaBuckets(trades: TradePoint[]): AreaBucket[] {
  if (trades.length === 0) return [];
  const map = new Map<number, TradePoint[]>();
  for (const t of trades) {
    const key = Math.round(t.areaM2);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(t);
  }
  const buckets: AreaBucket[] = [...map.entries()]
    .map(([areaM2, list]) => {
      const market = list.filter(isMarketTrade);
      const sample = market.length > 0 ? market : list; // 직거래만 있는 평형은 그대로
      const sum = sample.reduce(
        (s, t) => s + calcPricePerPyeong(t.priceM10k, t.areaM2),
        0
      );
      return {
        areaM2,
        trades: list,
        avgPricePerPyeong: Math.round(sum / sample.length),
      };
    })
    .sort((a, b) => b.trades.length - a.trades.length);
  return buckets.slice(0, 2);
}

export default function ApartmentSpecs({
  trades,
  totalUnits,
  builtYear,
  jeonseRatio,
}: Props) {
  const top = topAreaBuckets(trades);
  const age = builtYear ? 2026 - builtYear : null;
  const hasJeonse = jeonseRatio !== null && jeonseRatio !== undefined;

  // 초기비용 = 취득세 + 중개수수료 (대표 평형 A 매매 평균 기준)
  // 대표 평형 평균 평당가가 아닌 그 평형 매매 평균가 사용 — 거래 raw 평균
  const refTrades = top[0]?.trades ?? [];
  const refSaleAvg10k = refTrades.length > 0
    ? Math.round(refTrades.filter((t) => t.dealType !== '직거래').reduce((s, t) => s + t.priceM10k, 0) /
        Math.max(1, refTrades.filter((t) => t.dealType !== '직거래').length))
    : 0;
  const acquisitionTax = refSaleAvg10k > 0 ? calcAcquisitionTax(refSaleAvg10k) : 0;
  const brokerage = refSaleAvg10k > 0 ? calcBrokerageFee(refSaleAvg10k) : 0;
  const initialCost = acquisitionTax + brokerage;
  const refArea = top[0]?.areaM2;

  // 갭 = 매매 평균 - 전세 평균 (전세가율의 saleAvg/jeonseAvg 활용)
  const gapAmount =
    hasJeonse && jeonseRatio
      ? jeonseRatio.saleAvg10k - jeonseRatio.jeonseAvg10k
      : null;

  return (
    <section className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <h3 className="text-base font-bold">🏘️ 단지 구성</h3>
        <span className="text-[11px] text-foreground-sub">
          · 세대 · 전세가율 · 평형별 시세
        </span>
      </div>
      <p className="mt-1 text-xs text-foreground-sub">
        거래 데이터 기반 자동 집계예요. 평당가는 공급면적 기준이고, 직거래는 평균에서 제외했어요.
      </p>

      <div className="mt-5 grid auto-rows-fr gap-3 break-keep sm:grid-cols-3">
        {/* 1) 세대 · 연식 · 전세가율 */}
        <div
          className={`flex flex-col rounded-2xl border border-border bg-surface p-4 ${CARD_TINT.primary}`}
        >
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-foreground-sub">
            <Users className="h-3.5 w-3.5" />
            세대 구성
          </div>
          <div className="mt-2 text-lg font-bold text-foreground">
            {totalUnits ? `${totalUnits.toLocaleString()}세대` : '정보 없음'}
          </div>
          <div className="mt-1 text-[11px] leading-relaxed text-foreground-sub">
            {age !== null ? `${builtYear}년 입주 · ${age}년 차` : ''}
          </div>
          <div className="mt-auto pt-2 text-[11px] text-foreground-sub">
            {hasJeonse ? (
              <>
                <span className="font-semibold text-foreground">전세가율 {jeonseRatio.pct}%</span>
                <br />
                전세 {formatPrice10k(jeonseRatio.jeonseAvg10k)} · 매매 {formatPrice10k(jeonseRatio.saleAvg10k)} (전용 {jeonseRatio.areaM2}㎡)
              </>
            ) : (
              '전세가율 정보 준비 중'
            )}
          </div>
        </div>

        {/* 2 · 3) Top 평형 */}
        {top.length > 0 ? (
          top.map((b, i) => (
            <div
              key={b.areaM2}
              className={`flex flex-col rounded-2xl border border-border bg-surface p-4 ${CARD_TINT.primary}`}
            >
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-foreground-sub">
                {i === 0 ? <Home className="h-3.5 w-3.5" /> : <Ruler className="h-3.5 w-3.5" />}
                대표 평형 {i === 0 ? 'A' : 'B'}
              </div>
              <div className="mt-2 text-lg font-bold text-foreground">
                전용 {b.areaM2}㎡
              </div>
              <div className="mt-1 text-[11px] text-foreground-sub">
                약 {typicalPublicPyeong(b.areaM2)}평형 · {b.trades.length}건
              </div>
              <div className="mt-auto pt-2 text-[11px] font-semibold text-primary">
                {formatPricePerPyeong(b.avgPricePerPyeong)}
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-2 flex items-center justify-center rounded-2xl border border-dashed border-border bg-surface p-4 text-[11px] text-foreground-sub">
            평형 집계에 필요한 거래 데이터가 부족해요
          </div>
        )}
      </div>

      {/* 두번째 행: 초기비용 시뮬레이션 + 갭투자 시뮬레이션 */}
      {refSaleAvg10k > 0 ? (
        <div className="mt-3 grid auto-rows-fr gap-3 break-keep sm:grid-cols-2">
          {/* 초기비용 = 취득세 + 중개수수료 */}
          <div
            className={`flex flex-col rounded-2xl border border-border bg-surface p-4 ${CARD_TINT.warning}`}
          >
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-foreground-sub">
              <Receipt className="h-3.5 w-3.5" />
              매수 초기비용
            </div>
            <div className="mt-2 text-lg font-bold text-foreground">
              약 {formatPrice10k(initialCost)}
            </div>
            <div className="mt-1 text-[11px] leading-relaxed text-foreground-sub">
              취득세 {formatPrice10k(acquisitionTax)} · 중개수수료 {formatPrice10k(brokerage)}
            </div>
            <div className="mt-auto pt-2 text-[11px] text-foreground-sub">
              전용 {refArea}㎡ 매매 평균 {formatPrice10k(refSaleAvg10k)} 기준 · 1주택자 가정
            </div>
          </div>

          {/* 갭투자 시뮬 = 매매 - 전세 */}
          <div
            className={`flex flex-col rounded-2xl border border-border bg-surface p-4 ${
              hasJeonse ? CARD_TINT.success : CARD_TINT.neutral
            }`}
          >
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-foreground-sub">
              <Wallet className="h-3.5 w-3.5" />
              갭투자 시 필요자금
            </div>
            <div className="mt-2 text-lg font-bold text-foreground">
              {gapAmount !== null ? `약 ${formatPrice10k(gapAmount)}` : '정보 준비 중'}
            </div>
            <div className="mt-1 text-[11px] leading-relaxed text-foreground-sub">
              {hasJeonse && jeonseRatio
                ? `매매 ${formatPrice10k(jeonseRatio.saleAvg10k)} - 전세 ${formatPrice10k(jeonseRatio.jeonseAvg10k)}`
                : '전세 평균이 없어 산출 불가'}
            </div>
            <div className="mt-auto pt-2 text-[11px] text-foreground-sub">
              전세 끼고 매수 시 자기자금 추산값 · 참고용
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
