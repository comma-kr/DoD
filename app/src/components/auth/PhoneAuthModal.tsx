'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { isValidKoreanPhone, normalizePhone } from '@/lib/utils';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: (phone: string) => void;
}

type Step = 'phone' | 'code';

export default function PhoneAuthModal({ open, onClose, onSuccess }: Props) {
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!open) {
      setStep('phone');
      setPhone('');
      setCode('');
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

      onSuccess(data.phone);
    } catch {
      setError('네트워크 오류가 발생했어요');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="전화번호로 시작하기">
      <p className="mb-4 text-sm text-foreground-sub">
        가입 절차 없이 번호 하나로 무료 분석을 받으실 수 있어요.
      </p>

      {process.env.NODE_ENV === 'development' ? (
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
      ) : (
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
      )}
    </Modal>
  );
}
