import Link from 'next/link';
import { BarChart3, Target, ArrowRight, Sparkles } from 'lucide-react';
import { HOUSEHOLD_SPEC } from '@/lib/household-priorities';
import type { HouseholdType } from '@/types/profile';

interface Props {
  householdType?: HouseholdType | null;
  // 현재 보고 있는 단지 — compare 페이지에 prefill 해서 "옆 단지 하나만 더" 흐름으로 자연스럽게 잇기.
  currentApartmentId?: string | null;
  currentApartmentName?: string | null;
}

// 가구별 비교 CTA 카피 — "[가구] 입장에서 봐야 할 다른 단지" 식.
// 현재 단지가 있으면 카피도 "이 단지에 옆 단지 하나만 더" 톤으로 변경.
function compareCtaBody(
  household: HouseholdType | null | undefined,
  currentName: string | null | undefined
): string {
  if (currentName) {
    return `${currentName}에 옆 단지 1개만 더 얹어서 나란히 펼쳐드려요`;
  }
  if (!household) return '단지 2개를 한 장에 나란히';
  return HOUSEHOLD_SPEC[household].ctaSuggestion;
}

export default function UpsellCTAs({
  householdType,
  currentApartmentId,
  currentApartmentName,
}: Props = {}) {
  const compareHref = currentApartmentId
    ? `/compare?ids=${currentApartmentId}`
    : '/compare';
  const compareTitle = currentApartmentName
    ? `${currentApartmentName} + 옆 단지 칠래말래?`
    : '옆 단지도 칠래말래?';
  const compareBody = compareCtaBody(householdType, currentApartmentName);

  return (
    <section className="mt-12">
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h2 className="text-lg font-bold">아직 칠까말까 싶다면</h2>
          <p className="mt-0.5 text-sm text-foreground-sub">한 장씩 더 가볍게 펼쳐보세요.</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-5">
        {/* 주력 BM — 990원 비교. 시각 우선순위 1 (3/5 폭) */}
        <Link
          href={compareHref}
          className="group relative flex h-full flex-col overflow-hidden rounded-2xl border-2 border-primary/40 bg-gradient-to-br from-primary-soft via-surface to-surface p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary hover:shadow-lg sm:col-span-3"
        >
          <span className="inline-flex w-fit items-center gap-1 self-start rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
            <Sparkles className="h-3 w-3" />
            바로 다음 단계
          </span>
          <div className="mt-4 flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-sm">
              <BarChart3 className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold leading-tight text-foreground">
              {compareTitle}
            </h3>
          </div>
          <p className="mt-3 flex-1 text-sm leading-relaxed text-foreground-sub">
            {compareBody}
          </p>
          <div className="mt-5 flex items-center justify-between border-t border-primary/20 pt-3">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-primary-ink">
                커피 한 입 값
              </div>
              <div className="text-2xl font-extrabold text-foreground">990원</div>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-2 text-xs font-bold text-white transition group-hover:gap-2">
              나란히 보기
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </span>
          </div>
        </Link>

        {/* 미구현 — 2,990원 맞춤 추천. 메인 페이지 TBD 카드와 동일 톤 (점선 보더 + dim) */}
        <Link
          href="/smart"
          className="group flex h-full flex-col rounded-2xl border-2 border-dashed border-border bg-surface-soft p-5 opacity-80 transition hover:opacity-100 sm:col-span-2"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-foreground/5 text-foreground-sub">
              <Target className="h-4 w-4" />
            </div>
            <span className="rounded-full bg-foreground/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-foreground-sub">
              TBD
            </span>
          </div>
          <h3 className="mt-4 text-base font-bold leading-tight text-foreground">
            🚧 나한테 맞는 곳 찾기
          </h3>
          <p className="mt-1 flex-1 text-xs leading-relaxed text-foreground-sub">
            내 조건에 맞는 TOP 5, 칠 만한 곳만. 곧 픽스해서 알려드림.
          </p>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-base font-bold text-foreground-sub">2,990원</span>
            <ArrowRight className="h-4 w-4 text-foreground-sub transition group-hover:translate-x-0.5" />
          </div>
        </Link>
      </div>
    </section>
  );
}
