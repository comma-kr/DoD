import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import LandingSearch from '@/components/search/LandingSearch';
import WhyChillaeMallaeSection from '@/components/landing/WhyChillaeMallaeSection';

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

      {/* WHY 칠래말래? — 카드 클릭 시 미리보기 펼침 (client component) */}
      <WhyChillaeMallaeSection />
    </main>
  );
}
