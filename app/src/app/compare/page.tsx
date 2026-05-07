'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Building2, Plus, X } from 'lucide-react';
import SearchBar, { type SearchResult } from '@/components/search/SearchBar';
import PhoneAuthModal from '@/components/auth/PhoneAuthModal';
import Button from '@/components/ui/Button';
import { formatPrice } from '@/lib/utils';
import { PRODUCT_PRICES } from '@/lib/pricing';

const MAX_COMPARE = 2;

function ComparePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [picks, setPicks] = useState<SearchResult[]>([]);
  const [authOpen, setAuthOpen] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => setAuthenticated(d.authenticated))
      .catch(() => {});
  }, []);

  // ?ids=A,B,C 쿼리 → 단지 정보 prefilled
  useEffect(() => {
    const ids = searchParams.get('ids');
    if (!ids) return;
    const idList = ids.split(',').filter(Boolean).slice(0, MAX_COMPARE);
    if (idList.length === 0) return;
    Promise.all(
      idList.map((id) =>
        fetch(`/api/apartments/${id}`)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null)
      )
    ).then((results) => {
      const validApts: SearchResult[] = [];
      for (const data of results) {
        if (data?.apartment) {
          validApts.push({
            id: data.apartment.id,
            name: data.apartment.name,
            address: data.apartment.address,
            totalUnits: data.apartment.totalUnits,
            builtYear: data.apartment.builtYear,
            nearestStation: data.apartment.nearestStation,
            stationDistanceM: data.apartment.stationDistanceM,
          });
        }
      }
      if (validApts.length > 0) setPicks(validApts);
    });
  }, [searchParams]);

  function handleSelect(apt: SearchResult) {
    if (picks.find((p) => p.id === apt.id)) return;
    if (picks.length >= MAX_COMPARE) return;
    setPicks([...picks, apt]);
  }

  function handleRemove(id: string) {
    setPicks(picks.filter((p) => p.id !== id));
  }

  const canCheckout = picks.length >= 2;
  const amount = PRODUCT_PRICES.compare_report;

  const runCheckout = useCallback(async () => {
    if (!canCheckout) return;
    setLoading(true);
    setError(null);
    try {
      const prepRes = await fetch('/api/payment/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: 'compare_report',
          apartmentIds: picks.map((p) => p.id),
        }),
      });

      if (prepRes.status === 401) {
        setAuthOpen(true);
        return;
      }

      const prepData = await prepRes.json();
      if (!prepRes.ok) {
        setError('결제 준비 중 오류가 발생했어요');
        return;
      }

      // 🧪 테스트 바이패스: 서버에서 이미 리포트 생성 + 승인까지 완료됨
      if (prepData.testMode && prepData.reportId) {
        router.push(`/report/${prepData.reportId}`);
        return;
      }

      const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
      if (!clientKey) {
        setError('결제 설정이 누락됐어요 (NEXT_PUBLIC_TOSS_CLIENT_KEY)');
        return;
      }

      const { loadTossPayments, ANONYMOUS } = await import(
        '@tosspayments/tosspayments-sdk'
      );
      const toss = await loadTossPayments(clientKey);
      const payment = toss.payment({ customerKey: ANONYMOUS });

      await payment.requestPayment({
        method: 'CARD',
        amount: { currency: 'KRW', value: prepData.amount },
        orderId: prepData.orderId,
        orderName: prepData.orderName,
        successUrl: `${window.location.origin}/payment/success`,
        failUrl: `${window.location.origin}/payment/fail`,
      });
    } catch (err) {
      setError((err as Error).message ?? '결제 진행 중 오류가 발생했어요');
    } finally {
      setLoading(false);
    }
  }, [canCheckout, picks, router]);

  function handleAuthSuccess() {
    setAuthOpen(false);
    setAuthenticated(true);
    runCheckout();
  }

  function handleCheckoutClick() {
    if (!authenticated) {
      setAuthOpen(true);
      return;
    }
    runCheckout();
  }

  return (
    <main className="flex-1">
      <section className="mx-auto max-w-3xl px-6 pt-16 pb-24">
        <div className="mb-10 text-center">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-warning-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-warning">
            990원 · 한 장 더 펼치기
          </span>
          <h1 className="text-3xl font-bold sm:text-4xl">
            옆 단지도 <em className="report-highlight not-italic">칠래말래?</em>
          </h1>
          <p className="mt-4 leading-relaxed text-foreground-sub">
            단지 2개를 골라주시면 데이터로 나란히 펼쳐드려요.
          </p>
        </div>

        <SearchBar
          onSelect={handleSelect}
          placeholder="비교할 단지를 검색해주세요"
        />

        <div className="mt-8 space-y-3">
          {picks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-surface/40 p-8 text-center text-sm text-foreground-sub">
              단지 2개를 골라주세요
            </div>
          ) : (
            picks.map((p, i) => (
              <div
                key={p.id}
                className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 shadow-sm"
              >
                {/* A/B 라벨 (i=0→A, i=1→B). MAX_COMPARE=2 전제 — 3+로 확장 시 명시 매핑으로 교체. */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 font-bold text-primary">
                  {String.fromCharCode(65 + i)}
                </div>
                <div className="flex-1">
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-xs text-foreground-sub">{p.address}</div>
                </div>
                <button
                  onClick={() => handleRemove(p.id)}
                  className="rounded-full p-2 text-foreground-sub hover:bg-background hover:text-foreground"
                  aria-label="제거"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
          {picks.length > 0 && picks.length < MAX_COMPARE ? (
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-surface-soft p-4 text-xs text-foreground-sub">
              <Plus className="h-4 w-4" />한 단지 더 추가할 수 있어요
            </div>
          ) : null}
        </div>

        <div className="mt-10 rounded-3xl border border-border bg-surface p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-foreground-sub">옆 단지도 칠래말래?</div>
              <div className="mt-1 text-2xl font-bold">{formatPrice(amount)}</div>
            </div>
            <Building2 className="h-8 w-8 text-foreground-sub" />
          </div>
          <Button
            onClick={handleCheckoutClick}
            disabled={!canCheckout}
            loading={loading}
            size="lg"
            className="mt-6 w-full"
          >
            {formatPrice(amount)} · 옆 단지도 칠래말래
          </Button>
          {error ? (
            <p className="mt-3 text-center text-sm text-danger">{error}</p>
          ) : null}
          <p className="mt-3 text-center text-xs text-foreground-sub">
            매수 자문이 아니라, 칠까말까 정리에 도움을 드리는 참고용 정보예요
          </p>
        </div>
      </section>

      <PhoneAuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={handleAuthSuccess}
      />
    </main>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={<div className="px-6 pt-20 text-center text-foreground-sub">불러오는 중...</div>}>
      <ComparePageContent />
    </Suspense>
  );
}
