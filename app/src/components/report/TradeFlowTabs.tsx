'use client';

import { useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import PriceChart from './PriceChart';
import {
  calcPricePerPyeong,
  formatPrice10k,
  formatPricePerPyeong,
  typicalPublicPyeong,
  standardPrivateArea,
} from '@/lib/utils';
import type { TradePoint } from '@/types/apartment';

interface Props {
  trades: TradePoint[];
  apartmentName?: string;
}

interface AreaBucket {
  areaM2: number;       // 시장 표준 전용 ㎡ (59/74/84/99/114/134 등 — 한국 통용 호칭)
  pyeongSupply: number; // 시장 호칭 공급 평형 (33평형 등)
  trades: TradePoint[];
  count: number;
}

// 거래를 시장 표준 전용 평형으로 묶음. 거래 수 내림차순.
// 측정값(60.12, 59.94 등)은 모두 같은 분양 타입(59㎡)이므로 표준 평형으로 통합.
function groupByArea(trades: TradePoint[]): AreaBucket[] {
  if (trades.length === 0) return [];
  const map = new Map<number, TradePoint[]>();
  for (const t of trades) {
    const key = standardPrivateArea(t.areaM2);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(t);
  }
  return [...map.entries()]
    .map(([areaM2, list]) => ({
      areaM2,
      pyeongSupply: typicalPublicPyeong(areaM2),
      trades: list,
      count: list.length,
    }))
    .sort((a, b) => b.count - a.count);
}

export default function TradeFlowTabs({ trades, apartmentName }: Props) {
  const buckets = useMemo(() => groupByArea(trades), [trades]);
  const [activeIdx, setActiveIdx] = useState(0);

  if (buckets.length === 0) {
    return (
      <section className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
        <h3 className="text-lg font-bold">📈 실거래 흐름</h3>
        <p className="mt-3 text-sm text-foreground-sub">
          최근 실거래 데이터가 아직 수집되지 않았어요.
        </p>
      </section>
    );
  }

  const active = buckets[activeIdx] ?? buckets[0];
  // 차트·표용 — 날짜 오름차순 정렬, 최근 12개월(또는 전체)
  const sortedAsc = [...active.trades].sort(
    (a, b) => new Date(a.dealDate).getTime() - new Date(b.dealDate).getTime()
  );
  // 표는 최근 8건만
  const tableRows = sortedAsc.slice(-8);

  // 최고/최저 강조 (3건 이상 + 최고≠최저일 때)
  const showExtremes = tableRows.length >= 3;
  const maxIdx = showExtremes
    ? tableRows.reduce((mi, t, i) => (t.priceM10k > tableRows[mi].priceM10k ? i : mi), 0)
    : -1;
  const minIdx = showExtremes
    ? tableRows.reduce((mi, t, i) => (t.priceM10k < tableRows[mi].priceM10k ? i : mi), 0)
    : -1;
  const realShowExtremes = showExtremes && maxIdx !== minIdx;

  // 12개월 상승률 (현재 평형 기준)
  let delta12m: number | null = null;
  const latest = sortedAsc[sortedAsc.length - 1];
  if (latest && sortedAsc.length > 1) {
    const latestTime = new Date(latest.dealDate).getTime();
    const oneYearAgo = latestTime - 365 * 86_400_000;
    const past = sortedAsc.find((t) => new Date(t.dealDate).getTime() >= oneYearAgo);
    if (past && past !== latest) {
      delta12m = Math.round(((latest.priceM10k - past.priceM10k) / past.priceM10k) * 1000) / 10;
    }
  }

  const trendIcon =
    delta12m === null ? null : delta12m > 1 ? (
      <TrendingUp className="h-3.5 w-3.5 text-success" />
    ) : delta12m < -1 ? (
      <TrendingDown className="h-3.5 w-3.5 text-danger" />
    ) : (
      <Minus className="h-3.5 w-3.5 text-foreground-sub" />
    );
  const trendColor =
    delta12m === null
      ? 'text-foreground-sub'
      : delta12m > 1
      ? 'text-success'
      : delta12m < -1
      ? 'text-danger'
      : 'text-foreground-sub';

  return (
    <section className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="text-lg font-bold">📈 실거래 흐름</h3>
          <p className="mt-1 text-xs text-foreground-sub">
            {apartmentName ? `${apartmentName} · ` : ''}
            전용 {active.areaM2}㎡ (공급 {active.pyeongSupply}평형) · {active.count}건
          </p>
        </div>
        {delta12m !== null ? (
          <div className="flex items-center gap-1.5 rounded-xl bg-surface-soft px-3 py-1.5">
            {trendIcon}
            <span className={`text-xs font-semibold ${trendColor}`}>
              12개월 {delta12m > 0 ? '+' : ''}
              {delta12m}%
            </span>
          </div>
        ) : null}
      </header>

      {/* 평형 칩 탭 — 거래 많은 순. 디폴트 [0] = 가장 많이 거래된 평형. */}
      {buckets.length > 1 ? (
        <div className="mt-4 flex gap-1.5 overflow-x-auto pb-1">
          {buckets.map((b, i) => {
            const isActive = i === activeIdx;
            return (
              <button
                key={b.areaM2}
                type="button"
                onClick={() => setActiveIdx(i)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  isActive
                    ? 'border-primary bg-primary text-white shadow-sm'
                    : 'border-border bg-surface-soft text-foreground-sub hover:border-primary/40 hover:text-foreground'
                }`}
                aria-pressed={isActive}
              >
                전용 {b.areaM2}㎡ · {b.pyeongSupply}평형 ({b.count})
              </button>
            );
          })}
        </div>
      ) : null}

      {/* 가격 추이 차트 */}
      {sortedAsc.length >= 2 ? (
        <div className="mt-5">
          <PriceChart trades={sortedAsc} apartmentName={apartmentName} />
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-border bg-surface-soft p-6 text-center text-xs text-foreground-sub">
          이 평형은 관측된 거래가 1건이라 그래프를 그리기엔 데이터가 부족해요.
        </div>
      )}

      {/* 거래 표 — 최근 8건. 최고/최저 강조. */}
      <div className="mt-5 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border text-left text-foreground-sub">
              <th className="py-2 pr-3 font-semibold">거래월</th>
              <th className="py-2 pr-3 font-semibold">거래가</th>
              <th className="py-2 pr-3 font-semibold">평당가</th>
              <th className="py-2 font-semibold">층</th>
            </tr>
          </thead>
          <tbody>
            {tableRows.map((t, i) => {
              const ppy = calcPricePerPyeong(t.priceM10k, t.areaM2);
              const isMax = realShowExtremes && i === maxIdx;
              const isMin = realShowExtremes && i === minIdx;
              // 최고는 빨강 계열 (danger), 최저는 파랑 계열 (인라인 — 디자인 토큰에 blue 별도 X)
              const rowBg = isMax
                ? 'bg-danger-soft/40'
                : isMin
                ? ''
                : '';
              const rowStyle = isMin ? { background: '#DBEAFE' } : undefined;
              return (
                <tr key={i} className={`border-b border-border/40 ${rowBg}`} style={rowStyle}>
                  <td className="py-2 pr-3 text-foreground">{t.dealDate.slice(0, 7)}</td>
                  <td className="py-2 pr-3 font-semibold text-foreground">
                    {formatPrice10k(t.priceM10k)}
                    {isMax ? (
                      <span className="ml-1.5 inline-flex items-center rounded-md bg-danger-soft px-1.5 py-0.5 text-[9px] font-bold text-danger">
                        ▲ 최고
                      </span>
                    ) : null}
                    {isMin ? (
                      <span
                        className="ml-1.5 inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-bold"
                        style={{ background: '#DBEAFE', color: '#1D4ED8' }}
                      >
                        ▼ 최저
                      </span>
                    ) : null}
                  </td>
                  <td className="py-2 pr-3 text-foreground-sub">
                    {formatPricePerPyeong(ppy)}
                  </td>
                  <td className="py-2 text-foreground-sub">
                    {t.floor != null ? `${t.floor}층` : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {buckets.length > 1 ? (
        <p className="mt-3 text-[10px] text-foreground-sub">
          위 평형 칩 누르면 다른 평수 거래도 볼 수 있어요. 디폴트는 거래가 가장 많은 평형.
        </p>
      ) : null}
      <p className="mt-2 text-[10px] text-foreground-sub">
        ※ 평당가는 공급면적 기준 (시장 표준). 직거래 포함, 최근 8건 표시.
      </p>
    </section>
  );
}
