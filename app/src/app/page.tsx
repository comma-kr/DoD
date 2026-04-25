import Link from 'next/link';
import { Building2, BarChart3, Sparkles, ArrowRight } from 'lucide-react';
import LandingSearch from '@/components/search/LandingSearch';

export default function LandingPage() {
  return (
    <main className="flex-1">
      {/* 히어로 */}
      <section className="bg-surface">
        <div className="mx-auto max-w-5xl px-6 pt-14 pb-12 sm:pt-20 sm:pb-16">
          <div className="flex flex-col items-center text-center">
            <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-warning-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-warning">
              NEW · 오늘의 큐레이션
            </span>
            <h1 className="text-balance text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
              내가 아는 단지, <em className="report-highlight not-italic">제대로</em>
              <br />
              옆 단지랑 <em className="report-highlight not-italic">나란히</em>.
            </h1>
            <p className="mt-4 max-w-xl text-pretty text-base text-foreground-sub sm:text-lg">
              공짜로 만나는 단지 해설. 옆 단지랑 비교는{' '}
              <span className="font-semibold text-foreground">딱 990원.</span>
            </p>

            <div className="mt-7 w-full max-w-[520px]">
              <LandingSearch />
            </div>

            <p className="mt-3 text-xs text-foreground-sub">
              단지를 고르면 바로 분석 시작 · 전화번호 하나면 끝
            </p>

            <Link
              href="/analyze"
              className="mt-4 inline-flex items-center gap-2 text-sm text-foreground-sub hover:text-foreground"
            >
              또는 분석 페이지로 이동하기
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* 3단 소개 */}
      <section className="mx-auto max-w-5xl px-6 pt-20 pb-24 sm:pt-24">
        <div className="mb-10 text-center">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            WHY 입지990
          </span>
          <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            세 가지 방식으로, 가볍게.
          </h2>
        </div>
        <div className="grid auto-rows-fr gap-5 break-keep sm:grid-cols-3">
          <FeatureCard
            icon={<Building2 className="h-5 w-5" />}
            title="내 가족 관점으로"
            body="1인가구·신혼·학부모 등 가족 형태에 따라 같은 단지도 다르게 풀어드려요."
            badge="무료"
            badgeColor="accent"
          />
          <FeatureCard
            icon={<BarChart3 className="h-5 w-5" />}
            title="옆 단지랑 나란히"
            body="2~3개 단지를 데이터로 비교. 어떤 점이 다른지 한눈에 정리해드려요."
            badge="990원"
            badgeColor="primary"
          />
          <FeatureCard
            icon={<Sparkles className="h-5 w-5" />}
            title="한 장 더 보기"
            body="시세 흐름, 내 조건에 맞는 곳까지. 궁금증 따라 가볍게 추가로."
            badge="1,990원~"
            badgeColor="secondary"
          />
        </div>

        <div className="mt-16 rounded-3xl border border-border bg-surface p-8 text-center shadow-sm">
          <h2 className="text-2xl font-bold sm:text-3xl">
            데이터로 보는 우리 동네 아파트
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-foreground-sub">
            투자 판단이 아니라 고민 정리에 도움을 드리는 참고용 정보예요.
          </p>
          <Link
            href="/analyze"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-white transition hover:bg-primary/90"
          >
            지금 시작하기
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
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  badge: string;
  badgeColor: 'primary' | 'secondary' | 'accent';
}) {
  const badgeClass = {
    primary: 'bg-primary-soft text-primary',
    secondary: 'bg-primary-soft text-primary',
    accent: 'bg-success-soft text-success',
  }[badgeColor];

  const iconBgClass = {
    primary: 'bg-primary-soft text-primary',
    secondary: 'bg-primary-soft text-primary',
    accent: 'bg-success-soft text-success',
  }[badgeColor];

  return (
    <div className="group flex h-full flex-col rounded-2xl border border-border bg-surface p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
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
