// 토스페이먼츠 에러 코드 → 한국어 + 톤 분기 매핑
// 토스가 fail redirect로 보내는 code/message를 그대로 노출하면
// 영문 코드("INVALID_CARD_NUMBER", "NOT_FOUND_PAYMENT_SESSION")가 사용자에게 그대로 보임.
// CLAUDE.md 톤 가이드(가벼움 · 친근) + UX 분석가 §2.5 권장 사항.

export type TossErrorTone = 'cancel' | 'retry' | 'error';

export interface TossErrorInfo {
  title: string;
  body: string;
  tone: TossErrorTone;
}

const TOSS_ERROR_MAP: Record<string, TossErrorInfo> = {
  // 사용자가 의도적으로 닫음 — 무겁지 않게.
  USER_CANCEL: {
    title: '결제 취소했어요',
    body: '아무 일도 일어나지 않았어요. 다시 보고 싶으면 언제든.',
    tone: 'cancel',
  },
  PAY_PROCESS_CANCELED: {
    title: '결제가 멈췄어요',
    body: '취소되어 청구되지 않았어요. 다시 시도해보세요.',
    tone: 'cancel',
  },
  // 카드 정보 문제 — 다시 시도 권유.
  INVALID_CARD_NUMBER: {
    title: '카드 번호 확인이 필요해요',
    body: '카드번호가 맞는지 다시 한 번 확인해 주세요.',
    tone: 'retry',
  },
  INVALID_CARD_EXPIRATION: {
    title: '카드 유효기간 확인',
    body: '유효기간을 다시 입력해 주세요.',
    tone: 'retry',
  },
  INVALID_CARD_INSTALLMENT_PLAN: {
    title: '할부 옵션 문제',
    body: '카드사가 해당 할부를 지원하지 않아요. 일시불로 시도해보세요.',
    tone: 'retry',
  },
  // 한도/정책 — 다른 카드.
  EXCEED_MAX_DAILY_PAYMENT_COUNT: {
    title: '카드 일일 한도 초과',
    body: '오늘 결제 한도를 넘었어요. 다른 카드로 시도해보세요.',
    tone: 'retry',
  },
  EXCEED_MAX_AMOUNT: {
    title: '결제 한도 초과',
    body: '카드사 한도를 초과했어요. 다른 카드로 시도해보세요.',
    tone: 'retry',
  },
  REJECT_CARD_COMPANY: {
    title: '카드사가 거절했어요',
    body: '카드사에서 결제를 막았어요. 카드사에 직접 확인하거나 다른 카드로 시도해보세요.',
    tone: 'retry',
  },
  // 세션/요청 문제 — 잠시 후.
  NOT_FOUND_PAYMENT_SESSION: {
    title: '세션이 만료됐어요',
    body: '잠시 후 다시 시도해 주세요.',
    tone: 'retry',
  },
  INVALID_REQUEST: {
    title: '잘못된 요청',
    body: '잠시 후 다시 시도해 주세요. 계속되면 문의해주세요.',
    tone: 'error',
  },
  PROVIDER_ERROR: {
    title: '결제사 일시 오류',
    body: '잠시 후 다시 시도해 주세요.',
    tone: 'retry',
  },
  // 우리 서버 검증 실패 (success route → fail로 redirect 가정 X, 단 매핑은 success도 활용).
  AMOUNT_MISMATCH: {
    title: '결제 금액 불일치',
    body: '주문 금액과 결제 시도 금액이 달라요. 보안상 처리되지 않았어요. 다시 시도해주세요.',
    tone: 'error',
  },
};

export function resolveTossError(
  code: string | null | undefined,
  fallbackMessage: string | null | undefined
): TossErrorInfo {
  if (code && TOSS_ERROR_MAP[code]) return TOSS_ERROR_MAP[code];
  return {
    title: '결제가 완료되지 않았어요',
    body: fallbackMessage?.trim() || '잠시 후 다시 시도해 주세요.',
    tone: 'error',
  };
}
