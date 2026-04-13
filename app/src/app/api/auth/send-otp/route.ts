import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { sendSms, generateOtpCode, formatOtpMessage } from '@/lib/sens';
import { checkSmsRateLimit, logSmsDispatch, COOLDOWN_SECONDS } from '@/lib/rate-limit';
import { normalizePhone, isValidKoreanPhone } from '@/lib/utils';
import { TEST_PHONE, TEST_CODE } from '@/lib/test-bypass';

const schema = z.object({
  phone: z.string().min(1),
});

const OTP_TTL_MINUTES = 3;

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 });
  }

  const phone = normalizePhone(parsed.data.phone);
  if (!isValidKoreanPhone(phone)) {
    return NextResponse.json({ error: 'INVALID_PHONE' }, { status: 400 });
  }

  // 테스트 바이패스: 쿨다운/일일한도/SMS 발송 모두 건너뛰고 고정 코드 저장
  if (phone === TEST_PHONE) {
    const supabase = createSupabaseAdminClient();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1시간
    await supabase.from('otp_codes').upsert(
      {
        phone,
        code: TEST_CODE,
        expires_at: expiresAt.toISOString(),
        attempts: 0,
      },
      { onConflict: 'phone' }
    );
    console.log(`[TEST BYPASS] ${phone} → ${TEST_CODE}`);
    return NextResponse.json({
      ok: true,
      cooldownSeconds: 0,
      expiresInMinutes: 60,
      testMode: true,
    });
  }

  const rate = await checkSmsRateLimit(phone);
  if (!rate.allowed) {
    return NextResponse.json(
      {
        error: 'RATE_LIMITED',
        reason: rate.reason,
        retryAfterSeconds: rate.retryAfterSeconds,
      },
      { status: 429 }
    );
  }

  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  const supabase = createSupabaseAdminClient();
  const { error: upsertError } = await supabase.from('otp_codes').upsert(
    {
      phone,
      code,
      expires_at: expiresAt.toISOString(),
      attempts: 0,
    },
    { onConflict: 'phone' }
  );

  if (upsertError) {
    return NextResponse.json({ error: 'DB_ERROR' }, { status: 500 });
  }

  try {
    if (process.env.NODE_ENV === 'development' && !process.env.NCP_SENS_ACCESS_KEY) {
      // 개발 모드: SMS 발송 없이 서버 로그에 코드 출력
      console.log(`[DEV OTP] ${phone} → ${code}`);
    } else {
      await sendSms({ to: phone, content: formatOtpMessage(code) });
    }
  } catch (err) {
    return NextResponse.json(
      { error: 'SMS_SEND_FAILED', message: (err as Error).message },
      { status: 502 }
    );
  }

  await logSmsDispatch(phone);

  return NextResponse.json({
    ok: true,
    cooldownSeconds: COOLDOWN_SECONDS,
    expiresInMinutes: OTP_TTL_MINUTES,
  });
}
