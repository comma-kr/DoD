// "비교하기 좋은 단지 2곳" — 같은 권역·비슷한 가격대 단지 추천.
// 클릭 시 /compare 페이지로 진입 (apt 선택 prefilled).

import Link from 'next/link';
import { Building2, ArrowRight, Sparkles } from 'lucide-react';
import { formatPrice10k, formatPricePerPyeong } from '@/lib/utils';
import type { CompareSuggestion } from '@/lib/compare-suggestions';

interface Props {
  currentApartmentId: string;
  currentApartmentName: string;
  suggestions: CompareSuggestion[];
}

export default function CompareSuggestionsCard({
  currentApartmentId,
  currentApartmentName,
  suggestions,
}: Props) {
  if (suggestions.length === 0) return null;

  // 비교 페이지에 단지 ID prefilled. /compare?ids=A,B,C
  const allIds = [currentApartmentId, ...suggestions.map((s) => s.id)].join(',');
  const compareHref = `/compare?ids=${allIds}`;

  return (
    <section className="rounded-3xl border border-primary/30 bg-primary-soft/30 p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="text-base font-bold">옆 단지랑 나란히 보면 더 명확해져요</h3>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-foreground-sub break-keep">
        같은 권역에서 평당가 ±30% 안의 비교 좋은 단지 {suggestions.length}곳이에요.
        한 번에 비교 리포트로 받아보면 위치가 더 분명해져요.
      </p>

      <div className="mt-5 grid auto-rows-fr gap-3 break-keep sm:grid-cols-2">
        {suggestions.map((s) => (
          <div
            key={s.id}
            className="flex flex-col rounded-2xl border border-border bg-surface p-4 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <Building2 className="h-4 w-4" />
              </span>
              <div className="flex-1">
                <div className="text-sm font-bold text-foreground">{s.name}</div>
                <div className="mt-0.5 text-[11px] text-foreground-sub">{s.address}</div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
              {s.totalUnits ? (
                <span className="rounded-md border border-border px-1.5 py-0.5 text-foreground-sub">
                  {s.totalUnits.toLocaleString()}세대
                </span>
              ) : null}
              {s.builtYear ? (
                <span className="rounded-md border border-border px-1.5 py-0.5 text-foreground-sub">
                  {s.builtYear}년
                </span>
              ) : null}
              {s.nearestStation ? (
                <span className="rounded-md border border-border px-1.5 py-0.5 text-foreground-sub">
                  {s.nearestStation.split(' ')[0]}
                  {s.stationDistanceM
                    ? ` ${Math.max(1, Math.round(s.stationDistanceM / 70))}분`
                    : ''}
                </span>
              ) : null}
            </div>
            <div className="mt-auto pt-3 text-[11px]">
              <div className="font-semibold text-foreground">
                {s.avgPricePerPyeong ? formatPricePerPyeong(s.avgPricePerPyeong) : '평당가 정보 없음'}
              </div>
              {s.latestPriceM10k ? (
                <div className="text-foreground-sub">
                  최근 실거래 {formatPrice10k(s.latestPriceM10k)}
                </div>
              ) : null}
              <div className="mt-1 text-primary-ink">{s.reason}</div>
            </div>
          </div>
        ))}
      </div>

      <Link
        href={compareHref}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover"
      >
        {currentApartmentName} + 비슷한 가격대 {suggestions.length}곳 나란히 보기 · 990원
        <ArrowRight className="h-4 w-4" />
      </Link>
    </section>
  );
}
