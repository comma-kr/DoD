'use client';

import { useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import {
  HOUSEHOLD_LABELS,
  HOUSEHOLD_DESCRIPTIONS,
  HOUSEHOLD_EMOJIS,
  PRIORITY_LABELS,
  PRIORITY_EMOJIS,
  COMMUTE_LABELS,
  type HouseholdType,
  type Priority,
  type CommuteArea,
} from '@/types/profile';

interface Props {
  onComplete: (profile: {
    householdType: HouseholdType;
    priorities: Priority[];
    commuteArea?: CommuteArea;
    workplaceAddress?: string;
  }) => void;
  initialProfile?: {
    householdType?: HouseholdType;
    priorities?: Priority[];
    commuteArea?: CommuteArea;
    workplaceAddress?: string;
  };
}

type Step = 1 | 2 | 3;

const HOUSEHOLD_ORDER: HouseholdType[] = [
  'single',
  'couple',
  'newlywed',
  'family_kids',
  'school_parent',
  'retired',
  'investor',
];

const PRIORITY_ORDER: Priority[] = [
  'transport',
  'school',
  'convenience',
  'quiet',
  'newbuild',
  'size',
  'price',
  'community',
];

const COMMUTE_ORDER: CommuteArea[] = [
  'gangnam',
  'yeouido',
  'gwanghwamun',
  'pangyo',
  'jamsil',
  'mapo',
  'seongsu',
  'none',
];

const MAX_PRIORITIES = 3;

export default function ProfileForm({ onComplete, initialProfile }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [householdType, setHouseholdType] = useState<HouseholdType | null>(
    initialProfile?.householdType ?? null
  );
  const [priorities, setPriorities] = useState<Priority[]>(
    initialProfile?.priorities ?? []
  );
  const [commuteArea, setCommuteArea] = useState<CommuteArea | null>(
    initialProfile?.commuteArea ?? null
  );
  const [workplaceAddress, setWorkplaceAddress] = useState(
    initialProfile?.workplaceAddress ?? ''
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function togglePriority(p: Priority) {
    setPriorities((prev) => {
      if (prev.includes(p)) return prev.filter((x) => x !== p);
      if (prev.length >= MAX_PRIORITIES) return prev;
      return [...prev, p];
    });
  }

  async function handleSubmit() {
    if (!householdType || priorities.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const trimmedAddress = workplaceAddress.trim();
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          householdType,
          priorities,
          commuteArea: commuteArea ?? undefined,
          workplaceAddress: trimmedAddress.length > 0 ? trimmedAddress : undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.error === 'TABLE_MISSING') {
          onComplete({
            householdType,
            priorities,
            commuteArea: commuteArea ?? undefined,
            workplaceAddress: trimmedAddress.length > 0 ? trimmedAddress : undefined,
          });
          return;
        }
        setError('프로필 저장에 실패했어요');
        return;
      }

      onComplete({
        householdType,
        priorities,
        commuteArea: commuteArea ?? undefined,
        workplaceAddress: trimmedAddress.length > 0 ? trimmedAddress : undefined,
      });
    } catch {
      setError('네트워크 오류가 발생했어요');
    } finally {
      setSubmitting(false);
    }
  }

  const canNextFrom1 = householdType !== null;
  const canNextFrom2 = priorities.length > 0;
  const canSubmit = householdType !== null && priorities.length > 0;

  return (
    <div className="mx-auto w-full max-w-xl">
      {/* 진행 인디케이터 */}
      <div className="mb-8 flex items-center gap-2">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className={`h-1.5 flex-1 rounded-full transition ${
              n <= step ? 'bg-primary' : 'bg-border'
            }`}
          />
        ))}
      </div>

      {step === 1 ? (
        <Step1
          selected={householdType}
          onSelect={setHouseholdType}
          onNext={() => canNextFrom1 && setStep(2)}
          canNext={canNextFrom1}
        />
      ) : null}

      {step === 2 ? (
        <Step2
          selected={priorities}
          onToggle={togglePriority}
          onBack={() => setStep(1)}
          onNext={() => canNextFrom2 && setStep(3)}
          canNext={canNextFrom2}
        />
      ) : null}

      {step === 3 ? (
        <Step3
          selected={commuteArea}
          onSelect={setCommuteArea}
          workplaceAddress={workplaceAddress}
          onWorkplaceChange={setWorkplaceAddress}
          onBack={() => setStep(2)}
          onSubmit={handleSubmit}
          submitting={submitting}
          canSubmit={canSubmit}
          error={error}
        />
      ) : null}
    </div>
  );
}

function Step1({
  selected,
  onSelect,
  onNext,
  canNext,
}: {
  selected: HouseholdType | null;
  onSelect: (v: HouseholdType) => void;
  onNext: () => void;
  canNext: boolean;
}) {
  return (
    <div>
      <h2 className="text-2xl font-bold sm:text-3xl">
        어떤 가족 형태이신가요?
      </h2>
      <p className="mt-2 text-sm text-foreground-sub">
        같은 단지도 가족 형태에 따라 보는 포인트가 달라져요.
      </p>

      <div className="mt-8 grid gap-3">
        {HOUSEHOLD_ORDER.map((h) => {
          const active = selected === h;
          return (
            <button
              key={h}
              onClick={() => onSelect(h)}
              className={`flex items-center gap-4 rounded-2xl border p-5 text-left transition ${
                active
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-surface hover:border-foreground-sub/40'
              }`}
            >
              <span className="text-2xl">{HOUSEHOLD_EMOJIS[h]}</span>
              <div className="flex-1">
                <div className="font-semibold">{HOUSEHOLD_LABELS[h]}</div>
                <div className="text-xs text-foreground-sub">
                  {HOUSEHOLD_DESCRIPTIONS[h]}
                </div>
              </div>
              {active ? <Check className="h-5 w-5 text-primary" /> : null}
            </button>
          );
        })}
      </div>

      <div className="mt-8">
        <Button onClick={onNext} disabled={!canNext} size="lg" className="w-full">
          다음
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function Step2({
  selected,
  onToggle,
  onBack,
  onNext,
  canNext,
}: {
  selected: Priority[];
  onToggle: (v: Priority) => void;
  onBack: () => void;
  onNext: () => void;
  canNext: boolean;
}) {
  return (
    <div>
      <h2 className="text-2xl font-bold sm:text-3xl">
        가장 중요한 건 무엇인가요?
      </h2>
      <p className="mt-2 text-sm text-foreground-sub">
        최대 {MAX_PRIORITIES}개까지 고를 수 있어요. 리포트가 이 순서대로 풀려요.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-3">
        {PRIORITY_ORDER.map((p) => {
          const active = selected.includes(p);
          const order = selected.indexOf(p);
          return (
            <button
              key={p}
              onClick={() => onToggle(p)}
              className={`relative flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition ${
                active
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-surface hover:border-foreground-sub/40'
              }`}
            >
              <span className="text-2xl">{PRIORITY_EMOJIS[p]}</span>
              <span className="text-sm font-semibold">{PRIORITY_LABELS[p]}</span>
              {active ? (
                <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                  {order + 1}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="mt-8 flex gap-3">
        <Button onClick={onBack} variant="outline" size="lg" className="flex-1">
          이전
        </Button>
        <Button onClick={onNext} disabled={!canNext} size="lg" className="flex-[2]">
          다음
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function Step3({
  selected,
  onSelect,
  workplaceAddress,
  onWorkplaceChange,
  onBack,
  onSubmit,
  submitting,
  canSubmit,
  error,
}: {
  selected: CommuteArea | null;
  onSelect: (v: CommuteArea) => void;
  workplaceAddress: string;
  onWorkplaceChange: (v: string) => void;
  onBack: () => void;
  onSubmit: () => void;
  submitting: boolean;
  canSubmit: boolean;
  error: string | null;
}) {
  return (
    <div>
      <h2 className="text-2xl font-bold sm:text-3xl">출근지를 알려주세요</h2>
      <p className="mt-2 text-sm text-foreground-sub">
        이 정보로 리포트 상단에 <strong className="text-foreground">3가지 출근 경로</strong>가 자동으로 생성돼요. 건너뛰셔도 돼요.
      </p>

      <div className="mt-8 space-y-2">
        <div className="text-xs font-semibold text-foreground-sub">
          자주 가는 업무권역
        </div>
        <div className="grid grid-cols-2 gap-3">
          {COMMUTE_ORDER.map((c) => {
            const active = selected === c;
            return (
              <button
                key={c}
                onClick={() => onSelect(c)}
                className={`rounded-2xl border px-4 py-3.5 text-left font-semibold transition ${
                  active
                    ? 'border-primary bg-primary/10 text-foreground'
                    : 'border-border bg-surface text-foreground-sub hover:border-foreground-sub/40 hover:text-foreground'
                }`}
              >
                {COMMUTE_LABELS[c]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6 space-y-2">
        <div className="text-xs font-semibold text-foreground-sub">
          또는 정확한 회사 주소 (선택)
        </div>
        <Input
          type="text"
          placeholder="예: 서울 강남구 테헤란로 152"
          value={workplaceAddress}
          onChange={(e) => onWorkplaceChange(e.target.value)}
        />
        <p className="text-[11px] text-foreground-sub">
          주소를 입력하면 리포트에 그 주소가 함께 표시돼요.
        </p>
      </div>

      {error ? (
        <p className="mt-4 text-center text-sm text-danger">{error}</p>
      ) : null}

      <div className="mt-8 flex gap-3">
        <Button onClick={onBack} variant="outline" size="lg" className="flex-1">
          이전
        </Button>
        <Button
          onClick={onSubmit}
          disabled={!canSubmit}
          loading={submitting}
          size="lg"
          className="flex-[2]"
        >
          분석 시작하기
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
