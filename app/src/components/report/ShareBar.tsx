'use client';

import { useState } from 'react';
import { Link2, Check, Share2 } from 'lucide-react';

interface Props {
  title: string;
  url?: string;
}

export default function ShareBar({ title }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (typeof window === 'undefined') return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const el = document.createElement('input');
      el.value = window.location.href;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function handleNativeShare() {
    if (typeof window === 'undefined') return;
    const nav = navigator as Navigator & { share?: (data: ShareData) => Promise<void> };
    if (nav.share) {
      try {
        await nav.share({
          title,
          text: '입지990에서 받은 단지 분석 리포트',
          url: window.location.href,
        });
      } catch {
        // user cancelled or not supported
      }
    } else {
      handleCopy();
    }
  }

  return (
    <div className="flex items-center justify-between rounded-2xl border border-border bg-surface/40 p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface text-foreground-sub">
          <Share2 className="h-4 w-4" />
        </div>
        <div>
          <div className="text-sm font-semibold">이 리포트 공유하기</div>
          <div className="text-xs text-foreground-sub">
            링크만 보내도 상대방이 바로 볼 수 있어요
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-semibold text-foreground-sub transition hover:border-foreground-sub/50 hover:text-foreground"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" />
              복사됨
            </>
          ) : (
            <>
              <Link2 className="h-3.5 w-3.5" />
              링크
            </>
          )}
        </button>
        <button
          onClick={handleNativeShare}
          className="hidden items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white sm:flex"
        >
          <Share2 className="h-3.5 w-3.5" />
          공유
        </button>
      </div>
    </div>
  );
}
