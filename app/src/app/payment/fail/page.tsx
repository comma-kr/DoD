'use client';

import Link from 'next/link';
import { XCircle } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function FailContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get('code');
  const message = searchParams.get('message') ?? '결제가 취소되었어요';

  return (
    <div className="w-full max-w-md rounded-3xl border border-border bg-surface/60 p-10 text-center backdrop-blur">
      <XCircle className="mx-auto h-10 w-10 text-red-400" />
      <h1 className="mt-6 text-xl font-bold">결제가 완료되지 않았어요</h1>
      <p className="mt-2 text-sm text-foreground-sub">{message}</p>
      {code ? (
        <p className="mt-1 text-xs text-foreground-sub">코드: {code}</p>
      ) : null}
      <Link
        href="/compare"
        className="mt-6 inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white"
      >
        다시 시도하기
      </Link>
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
