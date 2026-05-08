'use client';

import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { isValidKoreanPhone, normalizePhone } from '@/lib/utils';
import {
  HOUSEHOLD_LABELS,
  HOUSEHOLD_DESCRIPTIONS,
  HOUSEHOLD_EMOJIS,
  type HouseholdType,
} from '@/types/profile';

interface Props {
  open: boolean;
  onClose: () => void;
  // 가구형태도 함께 받음 — 분석가 §2.3 권장: 인증 모달에 Step1(가족형태) 흡수.
  // ProfileForm 3-step 중 가장 무거운 첫 step을 인증 흐름에 합쳐 멘탈 모델 단순화.
  onSuccess: (phone: string, householdType: HouseholdType) => void;
}

type Step = 'phone' | 'code' | 'household';

const HOUSEHOLD_ORDER: HouseholdType[] = [
  'single',
  'couple',
  'newlywed',
  'family_kids',
  'school_parent',
  'retired',
  'investor',
];

export default function PhoneAuthModal({ open, onClose, onSuccess }: Props) {
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [household, setHousehold] = useState<HouseholdType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!open) {
      setStep('phone');
      setPhone('');
      setCode('');
      setHousehold(null);
      setError(null);
      setCooldown(0);
    }
  }, [open]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  async function handleSendOtp() {
    setError(null);
    const normalized = normalizePhone(phone);
    if (!isValidKoreanPhone(normalized)) {
      setError('올바른 휴대폰 번호를 입력해주세요');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalized }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.error === 'RATE_LIMITED' && data.reason === 'cooldown') {
          setError(`${data.retryAfterSeconds ?? 60}초 후에 다시 시도해주세요`);
        } else if (data.reason === 'daily_limit') {
          setError('오늘은 더 이상 요청할 수 없어요 (내일 다시 시도)');
        } else {
          setError('인증번호 전송에 실패했어요');
        }
        return;
      }

      setStep('code');
      setCooldown(data.cooldownSeconds ?? 60);
    } catch {
      setError('네트워크 오류가 발생했어요');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    setError(null);
    if (code.length !== 6) {
      setError('6자리 인증번호를 입력해주세요');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalizePhone(phone), code }),
      });
      const data = await res.json();

      if (!res.ok) {
        const map: Record<string, string> = {
          OTP_NOT_FOUND: '인증번호를 먼저 요청해주세요',
          OTP_EXPIRED: '인증번호가 만료됐어요. 다시 요청해주세요',
          OTP_MISMATCH: `인증번호가 일치하지 않아요${
            data.attemptsLeft !== undefined ? ` (남은 횟수 ${data.attemptsLeft})` : ''
          }`,
          MAX_ATTEMPTS: '시도 횟수를 초과했어요. 잠시 후 다시 시도해주세요',
        };
        setError(map[data.error as string] ?? '인증 실패');
        return;
      }

      // 인증 성공 → 가족형태 선택으로 이동 (모달 안에서 한 번에)
      setStep('household');
    } catch {
      setError('네트워크 오류가 발생했어요');
    } finally {
      setLoading(false);
    }
  }

  function handleConfirmHousehold() {
    if (!household) return;
    onSuccess(normalizePhone(phone), household);
  }

  // 모달 타이틀은 단계별 차별화
  const modalTitle = step === 'household'
    ? '어떤 가족 형태이신가요?'
    : '전화번호로 시작하기';

  return (
    <Modal open={open} onClose={onClose} title={modalTitle}>
      {step !== 'household' ? (
        <p className="mb-4 text-sm text-foreground-sub">
          가입 절차 없이 번호 하나로 무료 분석을 받으실 수 있어요.
        </p>
      ) : (
        <p className="mb-4 text-sm text-foreground-sub">
          같은 단지도 가족 형태에 따라 보는 포인트가 달라져요.
        </p>
      )}

      {process.env.NODE_ENV === 'development' && step !== 'household' ? (
        <div className="mb-4 rounded-xl border border-accent/30 bg-accent/10 p-3 text-xs text-foreground-sub">
          🧪 <span className="font-semibold text-accent">테스트 모드</span> —
          번호 <code className="mx-1 rounded bg-background px-1.5 py-0.5 text-accent">01011111234</code>
          와 인증번호 <code className="mx-1 rounded bg-background px-1.5 py-0.5 text-accent">111111</code>
          은 쿨다운 없이 바로 통과돼요.
        </div>
      ) : null}

      {step === 'phone' ? (
        <div className="flex flex-col gap-4">
          <Input
            type="tel"
            inputMode="numeric"
            placeholder="01012345678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            error={error ?? undefined}
          />
          <Button onClick={handleSendOtp} loading={loading} size="lg">
            인증번호 받기
          </Button>
        </div>
      ) : null}

      {step === 'code' ? (
        <div className="flex flex-col gap-4">
          <Input
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="6자리 숫자"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
            error={error ?? undefined}
            autoFocus
          />
          <Button onClick={handleVerifyOtp} loading={loading} size="lg">
            확인
          </Button>
          <button
            type="button"
            disabled={cooldown > 0}
            onClick={handleSendOtp}
            className="text-xs text-foreground-sub hover:text-foreground disabled:opacity-40"
          >
            {cooldown > 0 ? `재전송 ${cooldown}초` : '인증번호 다시 받기'}
          </button>
        </div>
      ) : null}

      {step === 'household' ? (
        <div className="flex flex-col gap-2">
          {HOUSEHOLD_ORDER.map((h) => {
            const active = household === h;
            return (
              <button
                key={h}
                onClick={() => setHousehold(h)}
                className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                  active
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-surface hover:border-foreground-sub/40'
                }`}
              >
                <span className="text-xl">{HOUSEHOLD_EMOJIS[h]}</span>
                <div className="flex-1">
                  <div className="text-sm font-semibold">{HOUSEHOLD_LABELS[h]}</div>
                  <div className="text-[11px] text-foreground-sub">
                    {HOUSEHOLD_DESCRIPTIONS[h]}
                  </div>
                </div>
                {active ? <Check className="h-4 w-4 text-primary" /> : null}
              </button>
            );
          })}
          <Button
            onClick={handleConfirmHousehold}
            disabled={!household}
            size="lg"
            className="mt-3"
          >
            확인
          </Button>
        </div>
      ) : null}
    </Modal>
  );
}
