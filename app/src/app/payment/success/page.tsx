'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, XCircle } from 'lucide-react';
import { resolveTossError } from '@/lib/toss-error-map';

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'processing' | 'error'>('processing');
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const paymentKey = searchParams.get('paymentKey');
    const orderId = searchParams.get('orderId');
    const amount = Number(searchParams.get('amount'));

    if (!paymentKey || !orderId || !amount) {
      setStatus('error');
      setErrorCode('MISSING_PAYMENT_PARAMS');
      setErrorMessage('결제 정보가 누락됐어요. 결제창을 통하지 않은 직접 진입일 수 있어요.');
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
          setErrorCode(data.error ?? 'CONFIRM_FAILED');
          setErrorMessage(null);
          return;
        }
        router.replace(`/report/${data.reportId}`);
      })
      .catch(() => {
        setStatus('error');
        setErrorCode('NETWORK_ERROR');
        setErrorMessage('네트워크 오류가 발생했어요.');
      });
  }, [router, searchParams]);

  if (status === 'processing') {
    return (
      <div className="w-full max-w-md rounded-3xl border border-border bg-surface p-10 text-center shadow-sm">
        <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
        <h1 className="mt-6 text-xl font-bold">리포트를 준비하고 있어요</h1>
        <p className="mt-2 text-sm text-foreground-sub">
          잠시만 기다려주세요. 결제 승인과 분석 생성이 진행되는 중이에요.
        </p>
      </div>
    );
  }

  // 에러 상태 — 자체 에러 코드도 toss-error-map에 있는 키(AMOUNT_MISMATCH 등)면 한국어 매핑.
  // 없으면 fallback. 사용자가 막히지 않게 다음 액션 3종 제공.
  const info = resolveTossError(errorCode, errorMessage);

  return (
    <div className="w-full max-w-md rounded-3xl border border-border bg-surface p-10 text-center shadow-sm">
      <XCircle className="mx-auto h-10 w-10 text-danger" />
      <h1 className="mt-6 text-xl font-bold">{info.title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-foreground-sub">{info.body}</p>
      {errorCode ? (
        <p className="mt-2 font-mono text-[10px] text-foreground-sub/70">코드: {errorCode}</p>
      ) : null}

      <div className="mt-6 flex flex-col gap-2">
        <Link
          href="/compare"
          className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white"
        >
          다시 결제하러 가기
        </Link>
        <Link
          href="/mypage"
          className="inline-flex items-center justify-center rounded-xl border border-border bg-surface px-5 py-3 text-sm font-semibold text-foreground hover:bg-background"
        >
          보관함에서 확인
        </Link>
        <a
          href="mailto:contact@chillaemallae.kr?subject=결제%20처리%20문의"
          className="mt-2 text-xs text-foreground-sub underline"
        >
          문제가 계속되면 문의하기
        </a>
      </div>
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
