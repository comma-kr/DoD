import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { createSession } from '@/lib/session';
import { recordOtpAttempt, isMaxAttemptsExceeded } from '@/lib/rate-limit';
import { normalizePhone } from '@/lib/utils';
import { isTestCredential } from '@/lib/test-bypass';

const schema = z.object({
  phone: z.string().min(1),
  code: z.string().length(6),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 });
  }

  const phone = normalizePhone(parsed.data.phone);
  const code = parsed.data.code;

  // 테스트 바이패스: 고정 조합이면 DB 조회 없이 즉시 세션 생성
  if (isTestCredential(phone, code)) {
    const supabase = createSupabaseAdminClient();
    await supabase.from('otp_codes').delete().eq('phone', phone);
    const session = await createSession(phone);
    return NextResponse.json({ ok: true, phone: session.phone, testMode: true });
  }

  const supabase = createSupabaseAdminClient();
  const { data: record, error } = await supabase
    .from('otp_codes')
    .select('code, expires_at, attempts')
    .eq('phone', phone)
    .maybeSingle();

  if (error || !record) {
    return NextResponse.json({ error: 'OTP_NOT_FOUND' }, { status: 404 });
  }

  if (isMaxAttemptsExceeded(record.attempts)) {
    return NextResponse.json({ error: 'MAX_ATTEMPTS' }, { status: 429 });
  }

  if (new Date(record.expires_at) < new Date()) {
    return NextResponse.json({ error: 'OTP_EXPIRED' }, { status: 410 });
  }

  if (record.code !== code) {
    const attempts = await recordOtpAttempt(phone);
    return NextResponse.json(
      { error: 'OTP_MISMATCH', attemptsLeft: Math.max(0, 5 - attempts) },
      { status: 401 }
    );
  }

  // 인증 성공 — OTP 삭제 후 세션 생성
  await supabase.from('otp_codes').delete().eq('phone', phone);
  const session = await createSession(phone);

  return NextResponse.json({ ok: true, phone: session.phone });
}
