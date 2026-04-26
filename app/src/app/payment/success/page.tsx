'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle2 } from 'lucide-react';

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'processing' | 'error'>('processing');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const paymentKey = searchParams.get('paymentKey');
    const orderId = searchParams.get('orderId');
    const amount = Number(searchParams.get('amount'));

    if (!paymentKey || !orderId || !amount) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus('error');
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMessage('결제 정보가 누락되었어요');
      return;
    }

    fetch('/api/payment/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentKey, orderId, amount }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setStatus('error');
          setMessage(
            data.error === 'AMOUNT_MISMATCH'
              ? '결제 금액이 일치하지 않아요'
              : '결제 승인 중 오류가 발생했어요'
          );
          return;
        }
        router.replace(`/report/${data.reportId}`);
      })
      .catch(() => {
        setStatus('error');
        setMessage('네트워크 오류가 발생했어요');
      });
  }, [router, searchParams]);

  return (
    <div className="w-full max-w-md rounded-3xl border border-border bg-surface p-10 text-center shadow-sm">
      {status === 'processing' ? (
        <>
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
          <h1 className="mt-6 text-xl font-bold">리포트를 준비하고 있어요</h1>
          <p className="mt-2 text-sm text-foreground-sub">
            잠시만 기다려주세요. 결제 승인과 분석 생성이 진행되는 중이에요.
          </p>
        </>
      ) : (
        <>
          <CheckCircle2 className="mx-auto h-10 w-10 text-danger" />
          <h1 className="mt-6 text-xl font-bold">결제 처리 문제</h1>
          <p className="mt-2 text-sm text-foreground-sub">{message}</p>
        </>
      )}
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-6">
      <Suspense
        fallback={
          <div className="text-foreground-sub">
            <Loader2 className="mx-auto h-6 w-6 animate-spin" />
          </div>
        }
      >
        <SuccessContent />
      </Suspense>
    </main>
  );
}
