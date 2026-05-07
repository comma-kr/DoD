import Link from 'next/link';
import { BarChart3, Target, ArrowRight } from 'lucide-react';
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

  const ctas = [
    {
      href: compareHref,
      icon: <BarChart3 className="h-5 w-5" />,
      title: compareTitle,
      body: compareCtaBody(householdType, currentApartmentName),
      price: '990원',
      color: 'primary' as const,
    },
    {
      href: '/smart',
      icon: <Target className="h-5 w-5" />,
      title: '나한테 맞는 곳 찾기',
      body: '내 조건에 맞는 TOP 5, 칠 만한 곳만',
      price: '2,990원',
      color: 'secondary' as const,
    },
  ];

  const colorClass = {
    primary: 'hover:border-primary/50 text-primary',
    secondary: 'hover:border-secondary/50 text-secondary',
  };

  return (
    <section className="mt-12 rounded-3xl border border-border bg-surface p-6 shadow-sm">
      <h2 className="mb-1 text-lg font-bold">아직 칠까말까 싶다면</h2>
      <p className="mb-6 text-sm text-foreground-sub">
        한 장씩 더 가볍게 펼쳐보세요.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {ctas.map((cta) => (
          <Link
            key={cta.href}
            href={cta.href}
            className={`group flex h-full flex-col rounded-2xl border border-border bg-background p-5 transition ${colorClass[cta.color]}`}
          >
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-xl bg-surface ${colorClass[cta.color]}`}
            >
              {cta.icon}
            </div>
            <h3 className="mt-4 font-semibold text-foreground">{cta.title}</h3>
            <p className="mt-1 flex-1 text-xs text-foreground-sub">{cta.body}</p>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-base font-bold text-foreground">
                {cta.price}
              </span>
              <ArrowRight className="h-4 w-4 text-foreground-sub transition group-hover:translate-x-0.5 group-hover:text-foreground" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
