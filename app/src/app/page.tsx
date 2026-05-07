import Link from 'next/link';
import { Building2, BarChart3, HelpCircle, ArrowRight } from 'lucide-react';
import LandingSearch from '@/components/search/LandingSearch';

export default function LandingPage() {
  return (
    <main className="flex-1">
      {/* 히어로 */}
      <section className="bg-surface">
        <div className="mx-auto max-w-5xl px-6 pt-14 pb-12 sm:pt-20 sm:pb-16">
          <div className="flex flex-col items-center text-center">
            <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-warning-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-warning">
              NEW · 오늘의 단지
            </span>
            <h1 className="text-balance text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
              <em className="report-highlight not-italic">칠래말래?</em>
              <br />
              단지 살까말까, <em className="report-highlight not-italic">한 번 까봐</em>
            </h1>
            <p className="mt-4 max-w-xl text-pretty text-base text-foreground-sub sm:text-lg">
              990원이면 옆 단지랑 나란히.{' '}
              <span className="font-semibold text-foreground">사기 전에, 갈아타기 전에.</span>
            </p>

            <div className="mt-7 w-full max-w-[520px]">
              <LandingSearch />
            </div>

            <p className="mt-3 text-xs text-foreground-sub">
              단지 고르면 바로 펼쳐드림 · 번호만 인증하면 끝
            </p>

            <Link
              href="/analyze"
              className="mt-4 inline-flex items-center gap-2 text-sm text-foreground-sub hover:text-foreground"
            >
              또는 펼쳐보기 페이지로
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* 3단 소개 */}
      <section className="mx-auto max-w-5xl px-6 pt-20 pb-24 sm:pt-24">
        <div className="mb-10 text-center">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            WHY 칠래말래?
          </span>
          <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            세 가지 방식으로, 가볍게.
          </h2>
        </div>
        <div className="grid auto-rows-fr gap-5 break-keep sm:grid-cols-3">
          <FeatureCard
            icon={<Building2 className="h-5 w-5" />}
            title="혼자 살래 둘이 살래?"
            body="1인·딩크·신혼·아이 있는 집까지, 같은 단지도 내 시선 따라 다르게 펼쳐드려요."
            badge="무료"
            badgeColor="accent"
          />
          <FeatureCard
            icon={<BarChart3 className="h-5 w-5" />}
            title="옆 단지도 칠래말래?"
            body="단지 2개를 데이터로 나란히, 뭐가 다른지 한눈에 정리."
            badge="990원"
            badgeColor="primary"
          />
          <FeatureCard
            icon={<HelpCircle className="h-5 w-5" />}
            title="🚧 다음은 뭘 까볼까?"
            body="갈아타기? 학군 심층? 시세 알림? 어떤 걸 풀어드릴지 고민 중이에요. 곧 픽스해서 알려드림."
            badge="TBD"
            badgeColor="muted"
            placeholder
          />
        </div>

        <div className="mt-16 rounded-3xl border border-border bg-surface p-8 text-center shadow-sm">
          <h2 className="text-2xl font-bold sm:text-3xl">
            사기 전에, 단지 한 번 까봐
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-foreground-sub">
            매수 자문은 못 봐줘도, 살까말까 고민은 데이터로 풀어드려요.
          </p>
          <Link
            href="/analyze"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-white transition hover:bg-primary/90"
          >
            지금 한 번 까보기
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <p className="mt-10 text-center text-xs text-foreground-sub">
          본 서비스는 공공데이터(국토부, 학교알리미 등)를 기반으로 한 참고용
          정보이며, 판단의 책임은 이용자에게 있습니다.
        </p>
      </section>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  body,
  badge,
  badgeColor,
  placeholder = false,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  badge: string;
  badgeColor: 'primary' | 'secondary' | 'accent' | 'muted';
  placeholder?: boolean;
}) {
  const badgeClass = {
    primary: 'bg-primary-soft text-primary',
    secondary: 'bg-primary-soft text-primary',
    accent: 'bg-success-soft text-success',
    muted: 'bg-foreground/10 text-foreground-sub',
  }[badgeColor];

  const iconBgClass = {
    primary: 'bg-primary-soft text-primary',
    secondary: 'bg-primary-soft text-primary',
    accent: 'bg-success-soft text-success',
    muted: 'bg-foreground/5 text-foreground-sub',
  }[badgeColor];

  // placeholder는 "기능 미정" 상태 — 점선 보더 + dim 톤으로 시각 구분.
  // 실 기능 카드와 한눈에 다르다는 신호를 줘서 본인이 메인페이지 보고 즉시 인지.
  const containerClass = placeholder
    ? 'group flex h-full flex-col rounded-2xl border-2 border-dashed border-border bg-surface-soft p-6 opacity-80'
    : 'group flex h-full flex-col rounded-2xl border border-border bg-surface p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md';

  return (
    <div className={containerClass}>
      <div className="flex items-center justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBgClass}`}>
          {icon}
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClass}`}>
          {badge}
        </span>
      </div>
      <h3 className="mt-5 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-foreground-sub">{body}</p>
    </div>
  );
}
