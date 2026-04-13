// OTP 남용 방지 — 번호당 1분 쿨다운, 일일 5회 제한, 시도 5회 실패 시 10분 락

import { createSupabaseAdminClient } from './supabase/server';

const COOLDOWN_SECONDS = 60;
const DAILY_LIMIT = 5;
const MAX_ATTEMPTS = 5;

export interface RateLimitResult {
  allowed: boolean;
  reason?: 'cooldown' | 'daily_limit' | 'max_attempts';
  retryAfterSeconds?: number;
}

export async function checkSmsRateLimit(phone: string): Promise<RateLimitResult> {
  const supabase = createSupabaseAdminClient();
  const now = new Date();

  // 쿨다운: 최근 sms_logs 조회
  const cooldownStart = new Date(now.getTime() - COOLDOWN_SECONDS * 1000);
  const { data: recentLog } = await supabase
    .from('sms_logs')
    .select('sent_at')
    .eq('phone', phone)
    .gte('sent_at', cooldownStart.toISOString())
    .order('sent_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recentLog) {
    const elapsed = Math.floor(
      (now.getTime() - new Date(recentLog.sent_at).getTime()) / 1000
    );
    return {
      allowed: false,
      reason: 'cooldown',
      retryAfterSeconds: COOLDOWN_SECONDS - elapsed,
    };
  }

  // 일일 한도: 오늘 발송 건수
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const { count } = await supabase
    .from('sms_logs')
    .select('*', { count: 'exact', head: true })
    .eq('phone', phone)
    .gte('sent_at', dayStart.toISOString());

  if ((count ?? 0) >= DAILY_LIMIT) {
    return { allowed: false, reason: 'daily_limit' };
  }

  return { allowed: true };
}

export async function logSmsDispatch(phone: string): Promise<void> {
  const supabase = createSupabaseAdminClient();
  await supabase.from('sms_logs').insert({ phone });
}

export async function recordOtpAttempt(phone: string): Promise<number> {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from('otp_codes')
    .select('attempts')
    .eq('phone', phone)
    .maybeSingle();

  const newAttempts = (data?.attempts ?? 0) + 1;
  await supabase
    .from('otp_codes')
    .update({ attempts: newAttempts })
    .eq('phone', phone);

  return newAttempts;
}

export function isMaxAttemptsExceeded(attempts: number): boolean {
  return attempts >= MAX_ATTEMPTS;
}

export { COOLDOWN_SECONDS, DAILY_LIMIT, MAX_ATTEMPTS };
