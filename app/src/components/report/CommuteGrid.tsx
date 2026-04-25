import { Clock, Briefcase } from 'lucide-react';
import { getCommuteGrid, getVerdictColor } from '@/lib/commute-matrix';
import { COMMUTE_LABELS, type CommuteArea } from '@/types/profile';
import { CARD_TINT, type TintTone } from '@/lib/card-tint';

interface Props {
  address: string;
  highlightArea?: CommuteArea | null;
}

// verdict → 공용 tint tone 매핑
const verdictTone: Record<string, TintTone> = {
  최적: 'success',
  편리: 'primary',
  보통: 'warning',
  불편: 'danger',
};

export default function CommuteGrid({ address, highlightArea }: Props) {
  const district = address.match(/서울(?:특별시)?\s+(\S+구)/)?.[1] ?? '';

  if (!district) {
    return null;
  }

  const grid = getCommuteGrid(district);
  const hasData = grid.some((g) => g.estimate !== null);

  if (!hasData) {
    return (
      <div className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-foreground-sub" />
          <h3 className="text-base font-bold">주요 업무지까지</h3>
        </div>
        <p className="mt-3 text-sm text-foreground-sub">
          {district} 기준 실시간 대중교통 데이터가 아직 수집되지 않았어요.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <Briefcase className="h-5 w-5 text-foreground-sub" />
        <h3 className="text-base font-bold">주요 업무지까지</h3>
        <span className="ml-1 text-xs text-foreground-sub">
          · {district} 기준
        </span>
      </div>
      <p className="mt-1 text-xs text-foreground-sub">
        참고 수치예요. 실제 시간대와 환승 대기에 따라 달라질 수 있어요.
      </p>

      <div className="mt-5 grid auto-rows-fr grid-cols-2 gap-2 break-keep sm:grid-cols-3 lg:grid-cols-4">
        {grid.map(({ area, label, estimate }) => {
          const active = area === highlightArea;
          if (!estimate) {
            return (
              <div
                key={area}
                className="rounded-2xl border border-border bg-surface-soft p-3 opacity-50"
              >
                <div className="text-xs font-semibold text-foreground-sub">
                  {label}
                </div>
                <div className="mt-2 text-xs text-foreground-sub">-</div>
              </div>
            );
          }
          const tint =
            CARD_TINT[verdictTone[estimate.verdict] ?? 'neutral'];
          return (
            <div
              key={area}
              className={`rounded-2xl border border-border bg-surface p-3 shadow-sm transition ${
                active
                  ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
                  : tint
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-foreground">
                  {label}
                  {active ? (
                    <span className="ml-1 text-[10px] font-bold text-primary">
                      · 내 출근지
                    </span>
                  ) : null}
                </div>
                <span
                  className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${getVerdictColor(estimate.verdict)}`}
                >
                  {estimate.verdict}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-1 text-sm font-bold text-foreground">
                <Clock className="h-3 w-3 text-foreground-sub" />
                {estimate.minMinutes}~{estimate.maxMinutes}분
              </div>
              <div className="mt-1 text-[10px] text-foreground-sub">
                {estimate.transferCount === 0 ? '직결' : `환승 ${estimate.transferCount}회`}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
