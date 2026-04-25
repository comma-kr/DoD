'use client';

import Link from 'next/link';
import { Target, Sparkles, ArrowLeft, Clock } from 'lucide-react';

export default function SmartPickPage() {
  return (
    <main className="flex-1">
      <section className="mx-auto max-w-2xl px-6 pt-16 pb-24">
        <Link
          href="/analyze"
          className="mb-6 inline-flex items-center gap-1 text-sm text-foreground-sub hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> 분석으로 돌아가기
        </Link>

        <div className="rounded-3xl border border-secondary/30 bg-primary-soft p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary/20 text-secondary">
            <Target className="h-7 w-7" />
          </div>
          <h1 className="mt-6 text-3xl font-bold sm:text-4xl">
            나한테 맞는 곳 찾기
          </h1>
          <p className="mt-3 text-sm text-foreground-sub">
            내 예산, 통근지, 우선순위로 AI가 TOP 5 단지를 추천해드려요.
          </p>

          <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-secondary/30 bg-secondary/10 px-4 py-2 text-xs font-semibold text-secondary">
            <Clock className="h-3.5 w-3.5" />곧 오픈 예정
          </div>

          <div className="mt-10 rounded-2xl border border-border bg-surface/60 p-6 text-left">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Sparkles className="h-4 w-4 text-secondary" />
              어떤 걸 받아볼 수 있나요?
            </div>
            <ul className="mt-4 space-y-3 text-sm text-foreground-sub">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-secondary">•</span>
                <span>
                  <strong className="text-foreground">예산 × 통근지 × 우선순위</strong>로 필터링한 단지 TOP 5
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-secondary">•</span>
                <span>
                  <strong className="text-foreground">왜 이 단지인지</strong> 각 추천마다 사유 설명
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-secondary">•</span>
                <span>
                  <strong className="text-foreground">각 단지의 평당가·시세 흐름</strong>을 한 장에 요약
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-secondary">•</span>
                <span>
                  <strong className="text-foreground">내 가족 형태에 맞춘</strong> 해설 (1인가구·신혼·학부모 등)
                </span>
              </li>
            </ul>
          </div>

          <div className="mt-8 rounded-2xl border border-border bg-surface/40 p-4 text-xs text-foreground-sub">
            <strong className="text-foreground">2,990원</strong>에 제공될 예정이에요. 오픈 시 보관함에서 알림 드릴게요.
          </div>

          <Link
            href="/analyze"
            className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white"
          >
            먼저 무료 단지 분석 받아보기
          </Link>
        </div>
      </section>
    </main>
  );
}
