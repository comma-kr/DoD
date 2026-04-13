import { Clock, MapPin, Info } from 'lucide-react';
import { generateRouteOptions } from '@/lib/route-options';
import { COMMUTE_LABELS, type CommuteArea } from '@/types/profile';

interface Props {
  district: string;
  commuteArea: CommuteArea | null | undefined;
  apartmentLat: number | null;
  apartmentLng: number | null;
  workplaceAddress?: string | null;
}

export default function RouteOptions({
  district,
  commuteArea,
  apartmentLat,
  apartmentLng,
  workplaceAddress,
}: Props) {
  const options = generateRouteOptions({
    district,
    commuteArea,
    apartmentLat,
    apartmentLng,
    workplaceAddress,
  });

  if (options.length === 0) {
    return null;
  }

  const targetLabel =
    workplaceAddress && workplaceAddress.trim().length > 0
      ? workplaceAddress
      : commuteArea && commuteArea !== 'none' && commuteArea !== 'etc'
      ? `${COMMUTE_LABELS[commuteArea]} 방면`
      : '출근지';

  return (
    <div className="rounded-3xl border border-primary/30 bg-primary/5 p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary">
          <MapPin className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <div className="text-xs text-foreground-sub">내 출근지까지</div>
          <div className="text-base font-bold text-foreground">
            {targetLabel}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {options.map((opt) => (
          <div
            key={opt.mode}
            className="rounded-2xl border border-border bg-background/60 p-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-lg">{opt.icon}</span>
              <span className="text-[11px] font-semibold text-foreground-sub">
                {opt.label}
              </span>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-base font-bold text-foreground">
              <Clock className="h-3.5 w-3.5 text-foreground-sub" />
              {opt.durationText}
            </div>
            <div className="mt-1 text-[11px] text-foreground-sub">
              {opt.transfersText}
            </div>
            <div className="mt-2 text-[11px] leading-relaxed text-foreground-sub">
              {opt.description}
            </div>
            {opt.note ? (
              <div className="mt-2 flex items-start gap-1 text-[10px] text-foreground-sub/80">
                <Info className="h-3 w-3 shrink-0" />
                {opt.note}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <p className="mt-4 text-[11px] text-foreground-sub">
        ※ 참고 수치예요. 실제 시간대·환승 대기·도로 상황에 따라 달라질 수 있어요.
      </p>
    </div>
  );
}
