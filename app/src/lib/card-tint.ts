// 카드 그룹에서 각 카드의 성격을 "왼쪽 4px accent bar"로만 표현.
// E1 코랄 펀치 컨셉: 카드 본체는 흰색으로 깔끔하게 두고, 스캔 힌트만
// 왼쪽 얇은 색 선으로 제공한다. 배경 전체에 tint를 칠하면 쇼핑몰 느낌이
// 나서 지양.
//
// 사용:
//   <div className={`rounded-2xl border border-border bg-surface p-4 shadow-sm ${CARD_TINT[tone]}`}>
//
// 매핑:
//   success → 초록 (최적·좋음·긍정)
//   primary → 코랄 (편리·관심·포커스)
//   warning → 노랑 (보통·주의)
//   danger  → 빨강 (불편·위험·하락)
//   neutral → 기본 (특성 없음)

export type TintTone = 'success' | 'primary' | 'warning' | 'danger' | 'neutral';

export const CARD_TINT: Record<TintTone, string> = {
  success: 'border-l-4 border-l-success',
  primary: 'border-l-4 border-l-primary',
  warning: 'border-l-4 border-l-warning',
  danger: 'border-l-4 border-l-danger',
  neutral: 'border-l-4 border-l-border',
};
