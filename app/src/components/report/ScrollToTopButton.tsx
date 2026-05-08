'use client';

import { useEffect, useState } from 'react';
import { ChevronUp } from 'lucide-react';

// 모바일 전용 '맨 위로' 플로팅 버튼.
// 리포트가 길어 스크롤 후 상단 TOC·헤더로 빠르게 복귀할 동선 제공.
// 데스크탑은 우측 sticky TOC가 있으므로 hidden sm:hidden(=항상 숨김).
export default function ScrollToTopButton() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    function onScroll() {
      setShow(window.scrollY > 600);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!show) return null;

  return (
    <button
      type="button"
      aria-label="맨 위로"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-5 right-5 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface/95 text-foreground-sub shadow-lg backdrop-blur transition hover:bg-background hover:text-foreground sm:hidden"
    >
      <ChevronUp className="h-5 w-5" />
    </button>
  );
}
