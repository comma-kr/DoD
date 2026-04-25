'use client';

import { useEffect, useState } from 'react';
import type { Heading } from '@/lib/markdown';

interface Props {
  headings: Heading[];
}

// 노량진 페이지의 우측 sticky 목차 + 모바일 상단 progress bar 차용.
// 데스크탑(≥1280px): 우측 sticky TOC. 모바일: 상단 thin progress bar.
export default function ReportTocBar({ headings }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  // 스크롤 진행도
  useEffect(() => {
    function onScroll() {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = max > 0 ? (window.scrollY / max) * 100 : 0;
      setProgress(Math.min(100, Math.max(0, ratio)));
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // 현재 활성 섹션
  useEffect(() => {
    if (headings.length === 0) return;
    const observers: IntersectionObserver[] = [];
    const visible = new Set<string>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.add(e.target.id);
          else visible.delete(e.target.id);
        }
        // 가장 위에 있는 visible 섹션을 active로
        const ordered = headings
          .map((h) => h.id)
          .filter((id) => visible.has(id));
        if (ordered.length > 0) setActiveId(ordered[0]);
      },
      { rootMargin: '-100px 0px -60% 0px', threshold: 0 }
    );

    for (const h of headings) {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    }
    observers.push(observer);

    return () => observers.forEach((o) => o.disconnect());
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <>
      {/* 모바일·데스크탑 공통 — 상단 진행 바 (헤더 바로 아래) */}
      <div
        aria-hidden
        className="fixed left-0 right-0 top-14 z-30 h-[2px] bg-transparent"
      >
        <div
          className="h-full bg-primary transition-[width] duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* 데스크탑 ≥1280px — 우측 sticky TOC */}
      <nav
        aria-label="리포트 목차"
        className="fixed right-6 top-1/2 z-20 hidden max-w-[200px] -translate-y-1/2 rounded-xl border border-border bg-surface/90 p-4 shadow-sm backdrop-blur xl:block"
      >
        <div className="mb-3 border-b border-border pb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground-sub">
          Contents
        </div>
        <ul className="space-y-0.5">
          {headings.map((h, i) => {
            const num = String(i + 1).padStart(2, '0');
            const active = activeId === h.id;
            return (
              <li key={h.id}>
                <a
                  href={`#${h.id}`}
                  className={`flex items-center gap-2 py-1.5 text-[12px] leading-tight transition ${
                    active
                      ? 'font-semibold text-primary'
                      : 'text-foreground-sub hover:text-foreground'
                  }`}
                >
                  <span
                    className={`font-mono text-[10px] font-semibold ${
                      active ? 'text-primary' : 'text-foreground-mute'
                    }`}
                  >
                    {num}
                  </span>
                  <span
                    className={`inline-block h-1 w-1 shrink-0 rounded-full transition ${
                      active ? 'bg-primary' : 'bg-border'
                    }`}
                  />
                  <span className="truncate">{h.text}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
