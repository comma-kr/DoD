// 상품 가격 Source of Truth
// 모든 결제 검증은 이 상수를 기준으로 한다. 클라이언트가 보낸 금액은 절대 신뢰하지 않는다.

export const PRODUCT_PRICES = {
  free_deep_single: 0,
  compare_report: 990,
  price_trend: 1990,
  smart_pick: 2990,
} as const;

export const PRODUCT_NAMES = {
  free_deep_single: '단지 심층 분석',
  compare_report: '나란히 보기',
  price_trend: '시세 흐름 한 장',
  smart_pick: '나한테 맞는 곳',
} as const;

export const PRODUCT_DESCRIPTIONS = {
  free_deep_single: '내가 아는 단지 하나, 제대로 정리해드려요',
  compare_report: '옆 단지랑 나란히 놓고 보기',
  price_trend: '이 단지 가격, 요즘 어떻게 움직이나',
  smart_pick: '내 예산이면 어디가 맞을까요',
} as const;

export type ProductId = keyof typeof PRODUCT_PRICES;

export function isValidProductId(id: string): id is ProductId {
  return id in PRODUCT_PRICES;
}

export function getPrice(productId: ProductId): number {
  return PRODUCT_PRICES[productId];
}

export function verifyPaymentAmount(productId: ProductId, amount: number): boolean {
  return PRODUCT_PRICES[productId] === amount;
}
