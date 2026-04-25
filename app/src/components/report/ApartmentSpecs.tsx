import { Home, Ruler, Users } from 'lucide-react';
import {
  calcPricePerPyeong,
  formatPricePerPyeong,
  typicalPublicPyeong,
} from '@/lib/utils';
import { CARD_TINT } from '@/lib/card-tint';
import type { TradePoint } from '@/types/apartment';

interface Props {
  trades: TradePoint[];
  totalUnits?: number | null;
  builtYear?: number | null;
  rentalRatio?: number | null; // 0~1 (e.g., 0.12)
  rentalUnits?: number | null; // 임대 세대 수
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
  rentalRatio,
  rentalUnits,
}: Props) {
  const top = topAreaBuckets(trades);
  const age = builtYear ? 2026 - builtYear : null;

  // 임대비율이 명시적으로 주어지지 않으면 "데이터 준비 중"
  const hasRentalData = rentalRatio !== null && rentalRatio !== undefined;
  const rentalPct = hasRentalData ? Math.round((rentalRatio as number) * 100) : null;

  return (
    <section className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <h3 className="text-base font-bold">🏘️ 단지 구성</h3>
        <span className="text-[11px] text-foreground-sub">
          · 세대 · 임대 · 평형별 시세
        </span>
      </div>
      <p className="mt-1 text-xs text-foreground-sub">
        거래 데이터 기반 자동 집계예요.
      </p>

      <div className="mt-5 grid auto-rows-fr gap-3 break-keep sm:grid-cols-3">
        {/* 1) 세대 · 연식 · 임대비율 */}
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
            {hasRentalData
              ? `임대 ${rentalUnits?.toLocaleString() ?? '?'}세대 (${rentalPct}%)`
              : '임대비율 정보 준비 중'}
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
    </section>
  );
}
