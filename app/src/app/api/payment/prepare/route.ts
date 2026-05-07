// 결제 사전 준비: 서버에서 orderId + amount를 확정해 pending 결제 레코드 생성.
// 이후 confirm 단계에서 orderId로 서버 저장값을 조회하므로,
// 클라이언트가 apartment_ids나 productId를 사후 조작해도 무의미하다.

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/session';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { PRODUCT_PRICES, PRODUCT_NAMES, isValidProductId } from '@/lib/pricing';
import { generateOrderId } from '@/lib/toss';
import { TEST_PHONE } from '@/lib/test-bypass';
import { fulfillPendingPayment, type PendingPaymentRow } from '@/lib/fulfillment';

const schema = z.object({
  productId: z.string(),
  apartmentIds: z.array(z.string().uuid()).min(1).max(3),
  userConditions: z.record(z.string(), z.unknown()).optional(),
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

  const { productId, apartmentIds, userConditions } = parsed.data;

  if (!isValidProductId(productId)) {
    return NextResponse.json({ error: 'INVALID_PRODUCT' }, { status: 400 });
  }

  // compare_report은 2개, 그 외는 1개 기대
  if (productId === 'compare_report' && apartmentIds.length !== 2) {
    return NextResponse.json({ error: 'COMPARE_REQUIRES_2' }, { status: 400 });
  }
  if (productId !== 'compare_report' && apartmentIds.length !== 1) {
    return NextResponse.json({ error: 'EXPECTED_SINGLE_APT' }, { status: 400 });
  }

  const amount = PRODUCT_PRICES[productId];
  if (amount === 0) {
    return NextResponse.json({ error: 'FREE_PRODUCT' }, { status: 400 });
  }

  const orderId = generateOrderId();
  const supabase = createSupabaseAdminClient();

  const { data: inserted, error } = await supabase
    .from('payments')
    .insert({
      phone: session.phone,
      order_id: orderId,
      product_id: productId,
      apartment_ids: apartmentIds,
      user_conditions: userConditions ?? null,
      amount,
      status: 'pending',
    })
    .select('*')
    .single();

  if (error || !inserted) {
    return NextResponse.json(
      { error: 'DB_ERROR', message: error?.message },
      { status: 500 }
    );
  }

  // 🧪 테스트 바이패스: 결제창 없이 즉시 리포트 생성 + 승인 처리
  if (session.phone === TEST_PHONE) {
    const result = await fulfillPendingPayment(inserted as PendingPaymentRow, {
      paymentKey: `test_bypass_${Date.now()}`,
      method: 'TEST_BYPASS',
      approvedAt: new Date().toISOString(),
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }

    return NextResponse.json({
      testMode: true,
      reportId: result.reportId,
      orderId,
      amount,
      orderName: PRODUCT_NAMES[productId],
    });
  }

  return NextResponse.json({
    orderId,
    amount,
    orderName: PRODUCT_NAMES[productId],
  });
}
