// 권역(동·구) 평균 대비 평당가 위치를 한 줄로 보여주는 띠.
// "영등포구 12위 / 350개 단지 · 평당가 7,030만원/평 (+12%)"

import { Globe } from 'lucide-react';
import { formatPricePerPyeong } from '@/lib/utils';
import type { RegionPercentileResult } from '@/lib/region-stats';

interface Props {
  data: RegionPercentileResult;
}

export default function RegionPercentileBar({ data }: Props) {
  const sign = data.diffPct > 0 ? '+' : '';
  const direction = data.diffPct > 5 ? 'up' : data.diffPct < -5 ? 'down' : 'flat';
  const directionLabel =
    direction === 'up' ? '높은 편' : direction === 'down' ? '낮은 편' : '평균권';
  const colorClass =
    direction === 'up'
      ? 'border-warning/30 bg-warning-soft text-warning'
      : direction === 'down'
      ? 'border-success/30 bg-success-soft text-success'
      : 'border-border bg-surface-soft text-foreground-sub';

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 shadow-sm break-keep">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
        <Globe className="h-3.5 w-3.5" />
      </span>
      <div className="flex flex-1 flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
        <span className="font-semibold text-foreground">
          {data.scopeLabel}{' '}
          {data.rank && data.totalApts ? (
            <>
              {data.rank}위<span className="text-foreground-sub"> / {data.totalApts}단지</span>
            </>
          ) : null}
        </span>
        <span className="text-foreground-sub">
          평당가 평균 <strong className="text-foreground">{formatPricePerPyeong(data.apartmentAvg)}</strong>
        </span>
        <span
          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-bold ${colorClass}`}
        >
          {data.scopeLabel} 평균 {sign}{data.diffPct}% · {directionLabel}
        </span>
      </div>
    </div>
  );
}
