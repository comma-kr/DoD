'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Building2, ArrowLeft, FileText, MapPin, UserCog } from 'lucide-react';
import SearchBar, { type SearchResult } from '@/components/search/SearchBar';
import PhoneAuthModal from '@/components/auth/PhoneAuthModal';
import ProfileForm from '@/components/analyze/ProfileForm';
import Button from '@/components/ui/Button';
import {
  HOUSEHOLD_LABELS,
  HOUSEHOLD_EMOJIS,
  PRIORITY_LABELS,
  COMMUTE_LABELS,
  type HouseholdType,
  type Priority,
  type CommuteArea,
} from '@/types/profile';

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
  // 현재 저장된 프로필 (ProfileForm prefill + 단지 카드 요약 표시용).
  // 사용자가 [조건 변경] 누르면 ProfileForm으로 진입, 새 입력으로 분석.
  const [savedProfile, setSavedProfile] = useState<ProfileInput | null>(null);
  // 일회성 override: ProfileForm에서 변경한 값 — runFreeAnalyze에 전달
  const [overrideProfile, setOverrideProfile] = useState<ProfileInput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [quotaState, setQuotaState] = useState<{
    exhausted: boolean;
    existingReportId: string | null;
    usedApartmentName: string | null;
    sameApartment: boolean;
  }>({
    exhausted: false,
    existingReportId: null,
    usedApartmentName: null,
    sameApartment: false,
  });

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
            if (profData.profile) {
              setSavedProfile({
                householdType: profData.profile.householdType,
                priorities: profData.profile.priorities,
                commuteArea: profData.profile.commuteArea,
                workplaceAddress: profData.profile.workplaceAddress,
              });
            }
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
      setQuotaState({
        exhausted: false,
        existingReportId: null,
        usedApartmentName: null,
        sameApartment: false,
      });
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
            usedApartmentName: data.usedApartmentName ?? null,
            sameApartment: !!data.sameApartment,
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

  // 인증 모달이 가족형태까지 받아오므로 시그니처가 (phone, household).
  // 분석가 §2.3-A: 인증+Step1 한 화면 → ProfileForm은 우선순위·출근지만 받기.
  function handleAuthSuccess(_phone: string, householdFromAuth?: import('@/types/profile').HouseholdType) {
    setAuthOpen(false);
    setAuthenticated(true);
    fetch('/api/profile/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const profileExists = !!d?.profile;
        setHasProfile(profileExists);
        if (profileExists) {
          setSavedProfile({
            householdType: d.profile.householdType,
            priorities: d.profile.priorities,
            commuteArea: d.profile.commuteArea,
            workplaceAddress: d.profile.workplaceAddress,
          });
          runFreeAnalyze();
        } else {
          // 인증 모달에서 받은 가족형태를 prefill — ProfileForm은 startStep=2부터 (우선순위)
          if (householdFromAuth) {
            setSavedProfile((prev) => ({
              householdType: householdFromAuth,
              priorities: prev?.priorities ?? [],
              commuteArea: prev?.commuteArea,
              workplaceAddress: prev?.workplaceAddress,
            }));
          }
          setStage('profile');
        }
      })
      .catch(() => {
        if (householdFromAuth) {
          setSavedProfile((prev) => ({
            householdType: householdFromAuth,
            priorities: prev?.priorities ?? [],
            commuteArea: prev?.commuteArea,
            workplaceAddress: prev?.workplaceAddress,
          }));
        }
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
    // override가 있으면 그걸로, 없으면 저장 프로필 (서버에서 자동 사용)
    runFreeAnalyze(overrideProfile ?? undefined);
  }

  function handleProfileComplete(profile: ProfileInput) {
    setHasProfile(true);
    setOverrideProfile(profile);
    setSavedProfile(profile); // 화면 표시용 동기화
    runFreeAnalyze(profile);
  }

  function handleEditProfile() {
    setStage('profile');
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

        <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-warning-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-warning">
          {/* 인증 모달에서 가족형태를 받았으면 남은 step 2개. 아니면 3개 */}
          STEP · {savedProfile?.householdType ? '2단계' : '3단계'} · 약 {savedProfile?.householdType ? '20' : '30'}초
        </span>
        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
          어떻게 풀어드릴지 <em className="report-highlight not-italic">정해볼까요</em>
        </h1>
        <p className="mb-8 mt-3 text-sm leading-relaxed text-foreground-sub">
          같은 단지도 1인가구와 4인가족에겐 완전히 다르게 보여요.
          <br className="hidden sm:block" /> 이 정보는 리포트가 어떤 관점으로 풀릴지
          결정해요.
        </p>
        <ProfileForm
          onComplete={handleProfileComplete}
          initialProfile={overrideProfile ?? savedProfile ?? undefined}
          // 인증 모달이 가족형태까지 받았으면 ProfileForm은 step 2(우선순위)부터 시작
          startStep={savedProfile?.householdType && !overrideProfile ? 2 : 1}
        />
      </section>
    );
  }

  if (stage === 'running') {
    return (
      <div className="mx-auto max-w-xl px-6 pt-24 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-surface">
          <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
        <h1 className="mt-6 text-2xl font-bold">한 장 펼치는 중...</h1>
        <p className="mt-2 text-sm text-foreground-sub">
          단지 데이터 정리하고 내 시선으로 다듬고 있어요.
        </p>
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-3xl px-6 pt-16 pb-24">
      <div className="mb-10 text-center">
        <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-warning-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-warning">
          FREE · 계정당 1회
        </span>
        <h1 className="text-3xl font-bold sm:text-4xl">
          어떤 단지부터 <em className="report-highlight not-italic">칠래말래?</em>
        </h1>
        <p className="mt-4 leading-relaxed text-foreground-sub">
          단지 하나 고르면 교통·학군·시세까지 한 장에 펼쳐드려요.
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

          {/* 현재 조건 요약 + [조건 변경] — 사용자가 다른 가구·우선순위로 분석 가능 */}
          {hasProfile && savedProfile ? (
            <button
              onClick={handleEditProfile}
              className="mt-5 flex w-full items-center gap-3 rounded-2xl border border-border bg-surface-soft px-4 py-3 text-left transition hover:border-primary/40 hover:bg-primary-soft/30"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <UserCog className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <div className="text-[11px] text-foreground-sub">내 조건</div>
                <div className="text-sm font-semibold text-foreground">
                  {HOUSEHOLD_EMOJIS[savedProfile.householdType]}{' '}
                  {HOUSEHOLD_LABELS[savedProfile.householdType]}
                  {savedProfile.priorities[0] ? (
                    <span className="ml-1.5 text-foreground-sub">
                      · {PRIORITY_LABELS[savedProfile.priorities[0]]}
                    </span>
                  ) : null}
                  {savedProfile.commuteArea && savedProfile.commuteArea !== 'none' ? (
                    <span className="ml-1.5 text-foreground-sub">
                      · {COMMUTE_LABELS[savedProfile.commuteArea]} 출근
                    </span>
                  ) : null}
                </div>
              </div>
              <span className="shrink-0 text-xs font-semibold text-primary">변경 →</span>
            </button>
          ) : null}

          {quotaState.exhausted ? (
            <div className="mt-6 rounded-2xl border border-secondary/30 bg-secondary/10 p-5">
              {/* 어떤 단지로 무료를 썼는지 상단에 명시 — 분석가 피드백: 사용자가 까먹어서 동선 끊김 */}
              {quotaState.usedApartmentName ? (
                <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-foreground/5 px-3 py-1 text-xs font-semibold text-foreground-sub">
                  <MapPin className="h-3 w-3" />
                  {quotaState.usedApartmentName}로 펼치셨어요
                </p>
              ) : null}
              <p className="font-semibold">이미 무료 분석을 받으셨어요</p>
              <p className="mt-2 text-sm text-foreground-sub">
                {quotaState.sameApartment
                  ? '이 단지로 받은 무료 리포트가 있어요. 바로 열어볼까요?'
                  : quotaState.existingReportId
                  ? '이전에 받은 리포트를 다시 열거나, 옆 단지랑 나란히 비교하시면 새로운 관점으로 보실 수 있어요 (딱 990원).'
                  : '다른 단지와 나란히 비교하시면 새로운 관점으로 보실 수 있어요 (딱 990원).'}
              </p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                {quotaState.existingReportId ? (
                  <Link
                    href={`/report/${quotaState.existingReportId}`}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white"
                  >
                    <FileText className="h-4 w-4" />
                    {quotaState.sameApartment ? '이전 리포트 열기' : '받았던 리포트 열기'}
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
