'use client';

import Link from 'next/link';
import { Clock, CreditCard, XCircle } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { resolveTossError, type TossErrorTone } from '@/lib/toss-error-map';

function FailContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get('code');
  const fallbackMessage = searchParams.get('message');
  const info = resolveTossError(code, fallbackMessage);

  // 톤별 아이콘·색상 분기
  const toneSpec: Record<TossErrorTone, { icon: React.ElementType; color: string }> = {
    cancel: { icon: Clock, color: 'text-foreground-sub' },
    retry: { icon: CreditCard, color: 'text-warning' },
    error: { icon: XCircle, color: 'text-danger' },
  };
  const { icon: Icon, color } = toneSpec[info.tone];

  return (
    <div className="w-full max-w-md rounded-3xl border border-border bg-surface p-10 text-center shadow-sm">
      <Icon className={`mx-auto h-10 w-10 ${color}`} />
      <h1 className="mt-6 text-xl font-bold">{info.title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-foreground-sub">{info.body}</p>
      {code ? (
        <p className="mt-2 font-mono text-[10px] text-foreground-sub/70">코드: {code}</p>
      ) : null}

      <div className="mt-6 flex flex-col gap-2">
        <Link
          href="/compare"
          className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white"
        >
          다시 시도하기
        </Link>
        {info.tone === 'error' ? (
          <a
            href="mailto:contact@chillaemallae.kr?subject=결제%20실패%20문의"
            className="text-xs text-foreground-sub underline"
          >
            문의하기
          </a>
        ) : null}
      </div>
    </div>
  );
}

export default function PaymentFailPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-6">
      <Suspense fallback={<div className="text-foreground-sub">불러오는 중...</div>}>
        <FailContent />
      </Suspense>
    </main>
  );
}
