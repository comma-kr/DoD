'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Building2, Sparkles, ArrowLeft, FileText } from 'lucide-react';
import SearchBar, { type SearchResult } from '@/components/search/SearchBar';
import PhoneAuthModal from '@/components/auth/PhoneAuthModal';
import ProfileForm from '@/components/analyze/ProfileForm';
import Button from '@/components/ui/Button';
import type { HouseholdType, Priority, CommuteArea } from '@/types/profile';

type Stage = 'pick' | 'profile' | 'running';

interface ProfileInput {
  householdType: HouseholdType;
  priorities: Priority[];
  commuteArea?: CommuteArea;
  workplaceAddress?: string;
}

function AnalyzeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const aptFromUrl = searchParams.get('apt');

  const [stage, setStage] = useState<Stage>('pick');
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [profileLoaded, setProfileLoaded] = useState<boolean>(false);
  const [hasProfile, setHasProfile] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [quotaState, setQuotaState] = useState<{
    exhausted: boolean;
    existingReportId: string | null;
  }>({ exhausted: false, existingReportId: null });

  // 초기 부트스트랩: 인증 + 프로필 + URL param 단지
  useEffect(() => {
    async function bootstrap() {
      try {
        const [meRes, aptRes] = await Promise.all([
          fetch('/api/auth/me'),
          aptFromUrl ? fetch(`/api/apartments/${aptFromUrl}`) : Promise.resolve(null),
        ]);

        const meData = await meRes.json();
        setAuthenticated(meData.authenticated);

        if (meData.authenticated) {
          const profRes = await fetch('/api/profile/me');
          if (profRes.ok) {
            const profData = await profRes.json();
            setHasProfile(!!profData.profile);
          }
        }

        if (aptRes && aptRes.ok) {
          const aptData = await aptRes.json();
          if (aptData.apartment) {
            setSelected({
              id: aptData.apartment.id,
              name: aptData.apartment.name,
              address: aptData.apartment.address,
              totalUnits: aptData.apartment.totalUnits,
              builtYear: aptData.apartment.builtYear,
              nearestStation: aptData.apartment.nearestStation,
              stationDistanceM: aptData.apartment.stationDistanceM,
            });
          }
        }
      } catch {
        setAuthenticated(false);
      } finally {
        setProfileLoaded(true);
      }
    }
    bootstrap();
  }, [aptFromUrl]);

  const runFreeAnalyze = useCallback(
    async (profileOverride?: ProfileInput, apartmentOverride?: SearchResult) => {
      const target = apartmentOverride ?? selected;
      if (!target) return;
      setStage('running');
      setError(null);
      setQuotaState({ exhausted: false, existingReportId: null });
      try {
        const res = await fetch('/api/analyze/free', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apartmentId: target.id,
            ...(profileOverride ? { profile: profileOverride } : {}),
          }),
        });

        if (res.status === 401) {
          setStage('pick');
          setAuthOpen(true);
          return;
        }
        if (res.status === 402) {
          const data = await res.json();
          setStage('pick');
          setQuotaState({
            exhausted: true,
            existingReportId: data.existingReportId ?? null,
          });
          return;
        }
        const data = await res.json();
        if (!res.ok) {
          setStage('pick');
          setError('분석 생성에 실패했어요. 잠시 후 다시 시도해주세요');
          return;
        }
        router.push(`/report/${data.reportId}`);
      } catch {
        setStage('pick');
        setError('네트워크 오류가 발생했어요');
      }
    },
    [selected, router]
  );

  function handleAuthSuccess() {
    setAuthOpen(false);
    setAuthenticated(true);
    fetch('/api/profile/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const profileExists = !!d?.profile;
        setHasProfile(profileExists);
        if (profileExists) {
          runFreeAnalyze();
        } else {
          setStage('profile');
        }
      })
      .catch(() => {
        setStage('profile');
      });
  }

  function handleRequestAnalyze() {
    if (!selected) return;
    if (!authenticated) {
      setAuthOpen(true);
      return;
    }
    if (!hasProfile) {
      setStage('profile');
      return;
    }
    runFreeAnalyze();
  }

  function handleProfileComplete(profile: ProfileInput) {
    setHasProfile(true);
    runFreeAnalyze(profile);
  }

  // --- RENDER ---

  if (!profileLoaded) {
    return (
      <div className="mx-auto max-w-3xl px-6 pt-20 text-center text-foreground-sub">
        불러오는 중...
      </div>
    );
  }

  if (stage === 'profile') {
    return (
      <section className="mx-auto max-w-3xl px-6 pt-12 pb-24">
        <button
          onClick={() => setStage('pick')}
          className="mb-6 flex items-center gap-1 text-sm text-foreground-sub hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> 뒤로
        </button>

        {selected ? (
          <div className="mb-6 rounded-2xl border border-primary/30 bg-primary/5 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="text-xs text-foreground-sub">
                  이 단지를 어떻게 분석해드릴까요?
                </div>
                <div className="text-base font-semibold text-foreground">
                  {selected.name}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-1.5 text-xs text-foreground-sub">
          <Sparkles className="h-3.5 w-3.5 text-secondary" />
          3단계 · 약 30초
        </div>
        <p className="mb-6 mt-2 text-sm text-foreground-sub">
          같은 단지도 1인가구와 4인가족에겐 완전히 다르게 보여요. 이 정보는 리포트에
          어떤 관점으로 풀릴지 결정해요.
        </p>
        <ProfileForm onComplete={handleProfileComplete} />
      </section>
    );
  }

  if (stage === 'running') {
    return (
      <div className="mx-auto max-w-xl px-6 pt-24 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-surface">
          <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
        <h1 className="mt-6 text-2xl font-bold">리포트를 준비하고 있어요</h1>
        <p className="mt-2 text-sm text-foreground-sub">
          단지 데이터를 정리하고, 가족 형태에 맞게 풀어드리고 있어요.
        </p>
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-3xl px-6 pt-16 pb-24">
      <div className="mb-10 text-center">
        <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-1.5 text-xs text-foreground-sub">
          <Sparkles className="h-3.5 w-3.5 text-secondary" />
          계정당 1회 무료 심층 분석
        </span>
        <h1 className="text-3xl font-bold sm:text-4xl">어떤 단지가 궁금하세요?</h1>
        <p className="mt-3 text-foreground-sub">
          단지를 하나 골라주시면 교통, 학군, 시세까지 제대로 정리해드려요.
        </p>
      </div>

      <SearchBar onSelect={setSelected} autoFocus={!selected} />

      {selected ? (
        <div className="mt-8 rounded-3xl border border-border bg-surface p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <Building2 className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold">{selected.name}</h2>
              <p className="mt-1 text-sm text-foreground-sub">{selected.address}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-foreground-sub">
                {selected.totalUnits ? (
                  <span className="rounded-full border border-border px-2.5 py-1">
                    {selected.totalUnits}세대
                  </span>
                ) : null}
                {selected.builtYear ? (
                  <span className="rounded-full border border-border px-2.5 py-1">
                    {selected.builtYear}년 입주
                  </span>
                ) : null}
                {selected.nearestStation ? (
                  <span className="rounded-full border border-border px-2.5 py-1">
                    {selected.nearestStation}{' '}
                    {selected.stationDistanceM ? `${selected.stationDistanceM}m` : ''}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {quotaState.exhausted ? (
            <div className="mt-6 rounded-2xl border border-secondary/30 bg-secondary/10 p-5">
              <p className="font-semibold">이미 무료 분석을 받으셨어요</p>
              <p className="mt-2 text-sm text-foreground-sub">
                {quotaState.existingReportId
                  ? '이 단지로 받은 무료 리포트가 있어요. 바로 열어볼까요?'
                  : '다른 단지와 나란히 비교하시면 새로운 관점으로 보실 수 있어요 (딱 990원).'}
              </p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                {quotaState.existingReportId ? (
                  <Link
                    href={`/report/${quotaState.existingReportId}`}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white"
                  >
                    <FileText className="h-4 w-4" />
                    이전 리포트 열기
                  </Link>
                ) : null}
                <Link
                  href="/compare"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-2.5 text-sm font-semibold text-white"
                >
                  나란히 보기로 가기 (990원)
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          ) : (
            <Button onClick={handleRequestAnalyze} size="lg" className="mt-6 w-full">
              무료로 분석 받기
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}

          {error ? (
            <p className="mt-3 text-center text-sm text-danger">{error}</p>
          ) : null}
        </div>
      ) : null}

      <PhoneAuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={handleAuthSuccess}
      />
    </section>
  );
}

export default function AnalyzePage() {
  return (
    <main className="flex-1">
      <Suspense
        fallback={
          <div className="mx-auto max-w-3xl px-6 pt-20 text-center text-foreground-sub">
            불러오는 중...
          </div>
        }
      >
        <AnalyzeContent />
      </Suspense>
    </main>
  );
}
