// 가구별 "본질 우선순위" 매트릭스.
// 사용자가 priorities를 직접 입력하지 않아도, 가구 형태별로 통상적으로 중요한
// 카드/섹션 순서가 자동 적용됨. 사용자 입력 1순위는 이 base 위에 다시 가장 앞으로.
//
// 예: 1인가구는 학군이 본질적으로 무관 → 학군 카드는 가장 뒤
//     자녀 있는 가족은 학군이 본질적으로 1순위 → 학군 카드 가장 앞
//     은퇴 부부는 의료/공원/생활편의 우선 → 인프라 카드 앞

import type { HouseholdType, Priority } from '@/types/profile';

// HookHighlights 4카드 키
export type HookKey = 'price' | 'mortgage' | 'transit' | 'school';

// InsightCards 6카테고리 키
export type InsightKey =
  | 'school'
  | 'transport'
  | 'commercial'
  | 'infra'
  | 'development'
  | 'nearby';

// LifeScenario 4시점 (시간대 + 시점 강조)
export type LifeKey = 'morning' | 'afternoon' | 'weekend' | 'night';

interface HouseholdSpec {
  // 카드/섹션 본질 순서 — 가장 먼저 나올 키부터
  hookOrder: HookKey[];
  insightOrder: InsightKey[];
  // 가구별 핵심 키워드 (UpsellCTAs / 추천 카드 카피에 활용)
  keyConcerns: string[];
  // CTA 카피 — "[가구]가 좋아할 단지 더 보기" 식
  ctaSuggestion: string;
}

export const HOUSEHOLD_SPEC: Record<HouseholdType, HouseholdSpec> = {
  single: {
    hookOrder: ['transit', 'price', 'mortgage', 'school'],
    insightOrder: ['transport', 'commercial', 'infra', 'nearby', 'development', 'school'],
    keyConcerns: ['통근 동선', '야간 보안', '1인 외식·배달 상권', '취미·문화 공간'],
    ctaSuggestion: '혼자 살기 좋은 비슷한 단지 비교',
  },
  couple: {
    hookOrder: ['transit', 'price', 'mortgage', 'school'],
    insightOrder: ['transport', 'commercial', 'infra', 'nearby', 'school', 'development'],
    keyConcerns: ['둘의 통근', '데이트·외식 상권', '한강·공원 산책', '평수와 분위기'],
    ctaSuggestion: '둘이 정주하기 좋은 비슷한 단지 비교',
  },
  newlywed: {
    hookOrder: ['transit', 'school', 'price', 'mortgage'],
    insightOrder: ['transport', 'school', 'infra', 'commercial', 'nearby', 'development'],
    keyConcerns: ['통근', '미래 자녀 학군 후보', '소아과·놀이터 인프라', '가족 친화 상권'],
    ctaSuggestion: '5~10년 뒤를 함께 견딜 단지 비교',
  },
  family_kids: {
    hookOrder: ['school', 'transit', 'price', 'mortgage'],
    insightOrder: ['school', 'infra', 'transport', 'commercial', 'nearby', 'development'],
    keyConcerns: ['배정 학교·통학 안전', '학원가 접근성', '소아 의료·놀이 인프라', '가족 외식 동선'],
    ctaSuggestion: '학군 좋은 비슷한 단지 비교',
  },
  school_parent: {
    hookOrder: ['school', 'price', 'transit', 'mortgage'],
    insightOrder: ['school', 'nearby', 'infra', 'commercial', 'transport', 'development'],
    keyConcerns: ['학원가 밀집도', '배정 명문 학교', '학원 셔틀 동선', '시세 안정성'],
    ctaSuggestion: '같은 학군 라인의 비슷한 단지 비교',
  },
  retired: {
    hookOrder: ['price', 'transit', 'mortgage', 'school'],
    insightOrder: ['infra', 'commercial', 'transport', 'nearby', 'development', 'school'],
    keyConcerns: ['종합병원 접근성', '평지 산책로·공원', '마트·생필품 가까움', '시세 안정'],
    ctaSuggestion: '은퇴 후 정주하기 좋은 비슷한 단지 비교',
  },
  investor: {
    hookOrder: ['price', 'mortgage', 'transit', 'school'],
    insightOrder: ['development', 'transport', 'school', 'nearby', 'commercial', 'infra'],
    keyConcerns: ['거래 활성도', '재건축·정비 호재', '임차 수요(학군·역)', '시세 추이'],
    ctaSuggestion: '같은 가격대 거래 활발한 단지 비교',
  },
};

// priority 입력 → 카드 키 매핑 (사용자 입력 1순위가 본질 base 위에 다시 가장 앞으로)
const PRIORITY_TO_HOOK: Partial<Record<Priority, HookKey>> = {
  price: 'price',
  transport: 'transit',
  school: 'school',
};

const PRIORITY_TO_INSIGHT: Partial<Record<Priority, InsightKey>> = {
  school: 'school',
  transport: 'transport',
  convenience: 'commercial',
  newbuild: 'development',
  community: 'nearby',
};

/**
 * 가구별 base 순서 + 사용자 1순위 우선 적용.
 * @returns hookOrder 정렬 결과 (가장 먼저 보여줄 카드부터)
 */
export function resolveHookOrder(
  household: HouseholdType | null | undefined,
  priorities: Priority[] | null | undefined
): HookKey[] {
  const base: HookKey[] = household
    ? HOUSEHOLD_SPEC[household].hookOrder
    : ['price', 'transit', 'school', 'mortgage'];
  const userTop = priorities?.[0];
  const userTopKey = userTop ? PRIORITY_TO_HOOK[userTop] : undefined;
  if (!userTopKey || !base.includes(userTopKey)) return base;
  return [userTopKey, ...base.filter((k) => k !== userTopKey)];
}

export function resolveInsightOrder(
  household: HouseholdType | null | undefined,
  priorities: Priority[] | null | undefined
): InsightKey[] {
  const base: InsightKey[] = household
    ? HOUSEHOLD_SPEC[household].insightOrder
    : ['transport', 'school', 'commercial', 'infra', 'development', 'nearby'];
  const userTop = priorities?.[0];
  const userTopKey = userTop ? PRIORITY_TO_INSIGHT[userTop] : undefined;
  if (!userTopKey || !base.includes(userTopKey)) return base;
  return [userTopKey, ...base.filter((k) => k !== userTopKey)];
}

/**
 * 가구별로 의미가 약한 카드는 숨김 처리.
 * 예: 1인가구·은퇴 부부는 학군 카드 비활성화 (회색 처리 또는 제외)
 */
export function isCardWeakForHousehold(
  household: HouseholdType | null | undefined,
  cardKey: HookKey | InsightKey
): boolean {
  if (!household) return false;
  if (household === 'single' && cardKey === 'school') return true;
  if (household === 'retired' && cardKey === 'school') return true;
  return false;
}
