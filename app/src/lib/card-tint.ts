// 카드 그룹에서 각 카드의 성격/accent를 옅은 배경 tint로 반영하는 공용 유틸.
// 튀지 않도록 -50 톤만 사용해서 스캔 시 "긍정=초록, 주의=빨강" 정도만 감지되게 한다.
//
// 사용:
//   <div className={`rounded-2xl border p-4 ${CARD_TINT[tone]}`}>
//
// 매핑 원칙:
//   success → 초록 (최적·좋음·긍정)
//   primary → 연 코랄 (편리·관심·포커스)
//   warning → 노랑 (보통·주의·중립 톤의 강조)
//   danger  → 빨강 (불편·위험·하락)
//   neutral → 회색 (특성 없음·기본)

export type TintTone = 'success' | 'primary' | 'warning' | 'danger' | 'neutral';

export const CARD_TINT: Record<TintTone, string> = {
  success: 'border-emerald-200 bg-emerald-50',
  primary: 'border-rose-200 bg-rose-50',
  warning: 'border-amber-200 bg-amber-50',
  danger: 'border-red-200 bg-red-50',
  neutral: 'border-border bg-surface-soft',
};
