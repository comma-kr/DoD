'use client';

import Link from 'next/link';
import { Target, Sparkles, ArrowLeft, Clock } from 'lucide-react';

export default function SmartPickPage() {
  return (
    <main className="flex-1">
      <section className="mx-auto max-w-2xl px-6 pt-16 pb-24">
        <Link
          href="/analyze"
          className="mb-8 inline-flex items-center gap-1 text-sm text-foreground-sub hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> 펼쳐보기로 돌아가기
        </Link>

        <div className="text-center">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-warning-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-warning">
            <Clock className="h-3 w-3" />
            COMING SOON · 2,990원
          </span>
          <h1 className="text-3xl font-bold sm:text-4xl">
            나한테 <em className="report-highlight not-italic">맞는 곳</em>은 어디
          </h1>
          <p className="mx-auto mt-4 max-w-md leading-relaxed text-foreground-sub">
            내 예산·통근지·우선순위 조합으로 칠 만한 단지 TOP 5를 골라드려요.
          </p>
        </div>

        <div className="mt-10 rounded-3xl border border-border bg-surface p-6 text-left shadow-sm sm:p-8">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            어떤 걸 받아볼 수 있나요?
          </div>
          <ul className="mt-5 space-y-3.5 text-sm leading-relaxed text-foreground-sub">
            <li className="flex items-start gap-2.5">
              <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <span>
                <strong className="text-foreground">예산 × 통근지 × 우선순위</strong>로 필터링한 단지 TOP 5
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <span>
                <strong className="text-foreground">왜 이 단지인지</strong> 각 추천마다 사유 설명
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <span>
                <strong className="text-foreground">각 단지의 평당가·시세 흐름</strong>을 한 장에 요약
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <span>
                <strong className="text-foreground">내 가족 형태에 맞춘</strong> 해설 (1인가구·신혼·학부모 등)
              </span>
            </li>
          </ul>
        </div>

        <p className="mt-6 text-center text-xs text-foreground-sub">
          <strong className="text-foreground">2,990원</strong>에 제공될 예정이에요. 오픈 시 보관함에서 알림 드릴게요.
        </p>

        <div className="mt-8 text-center">
          <Link
            href="/analyze"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary/90"
          >
            먼저 단지 한 장 무료로 펼쳐보기
          </Link>
        </div>
      </section>
    </main>
  );
}
