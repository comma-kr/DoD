// 토스페이먼츠 결제 승인 (서버)
// 금액 검증은 반드시 lib/pricing.ts 상수와 대조한 뒤 호출할 것.

import { PRODUCT_PRICES, type ProductId } from './pricing';

const TOSS_API_BASE = 'https://api.tosspayments.com/v1';

interface ConfirmPaymentParams {
  paymentKey: string;
  orderId: string;
  amount: number;
  productId: ProductId;
}

export interface TossConfirmResponse {
  paymentKey: string;
  orderId: string;
  status: string;
  totalAmount: number;
  method?: string;
  approvedAt?: string;
  [key: string]: unknown;
}

export async function confirmPayment(
  params: ConfirmPaymentParams
): Promise<TossConfirmResponse> {
  // 1차 검증: 클라가 보낸 금액이 상품 가격과 일치해야 함
  const expected = PRODUCT_PRICES[params.productId];
  if (params.amount !== expected) {
    throw new Error(
      `금액 불일치: productId=${params.productId}, expected=${expected}, got=${params.amount}`
    );
  }

  const secretKey = process.env.TOSS_SECRET_KEY!;
  const auth = Buffer.from(`${secretKey}:`).toString('base64');

  const response = await fetch(`${TOSS_API_BASE}/payments/confirm`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      paymentKey: params.paymentKey,
      orderId: params.orderId,
      amount: params.amount,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`토스 결제 승인 실패: ${JSON.stringify(error)}`);
  }

  const data = (await response.json()) as TossConfirmResponse;

  // 2차 검증: 토스 응답 금액도 상품 가격과 일치해야 함
  if (data.totalAmount !== expected) {
    throw new Error(
      `토스 응답 금액 불일치: expected=${expected}, got=${data.totalAmount}`
    );
  }

  return data;
}

export function generateOrderId(): string {
  return `order_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
