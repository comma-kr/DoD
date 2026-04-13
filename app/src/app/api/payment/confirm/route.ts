// 결제 승인 + 리포트 생성
// 보안 원칙:
//   1. 클라이언트가 보낸 amount는 orderId로 서버 DB 조회한 원본과 반드시 일치해야 함
//   2. 상품 ID, apartment_ids는 서버 저장값만 신뢰
//   3. 이미 승인된 orderId는 재승인 불가

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/session';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { confirmPayment } from '@/lib/toss';
import { fulfillPendingPayment, type PendingPaymentRow } from '@/lib/fulfillment';
import type { ProductId } from '@/lib/pricing';

const schema = z.object({
  paymentKey: z.string().min(1),
  orderId: z.string().min(1),
  amount: z.number().int().positive(),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 });
  }

  const { paymentKey, orderId, amount } = parsed.data;
  const supabase = createSupabaseAdminClient();

  const { data: pending, error: lookupError } = await supabase
    .from('payments')
    .select('*')
    .eq('order_id', orderId)
    .maybeSingle();

  if (lookupError || !pending) {
    return NextResponse.json({ error: 'ORDER_NOT_FOUND' }, { status: 404 });
  }
  if (pending.phone !== session.phone) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }
  if (pending.status === 'approved') {
    return NextResponse.json({ ok: true, reportId: pending.report_id });
  }
  if (pending.amount !== amount) {
    return NextResponse.json(
      { error: 'AMOUNT_MISMATCH', expected: pending.amount, got: amount },
      { status: 400 }
    );
  }

  // 토스 결제 승인
  let tossResult;
  try {
    tossResult = await confirmPayment({
      paymentKey,
      orderId,
      amount,
      productId: pending.product_id as ProductId,
    });
  } catch (err) {
    await supabase
      .from('payments')
      .update({ status: 'failed' })
      .eq('order_id', orderId);
    return NextResponse.json(
      { error: 'TOSS_CONFIRM_FAILED', message: (err as Error).message },
      { status: 502 }
    );
  }

  // 공유 헬퍼로 리포트 생성 + payment 승인 처리
  const result = await fulfillPendingPayment(pending as PendingPaymentRow, {
    paymentKey,
    method: tossResult.method ?? null,
    approvedAt: tossResult.approvedAt ?? new Date().toISOString(),
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status }
    );
  }

  return NextResponse.json({ ok: true, reportId: result.reportId });
}
