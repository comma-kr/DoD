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

// InsightCards 카드 키 (10종 → 가구별 6개 골라 노출)
export type InsightKey =
  | 'school'        // 학군
  | 'transport'     // 교통
  | 'commercial'    // 상권·생활권
  | 'infra'         // 인프라 (병원·공원 통합)
  | 'development'   // 개발 호재
  | 'nearby'        // 주변 대단지
  | 'hobby'         // 취미·문화 (영화관·서점·갤러리)
  | 'parks'         // 공원·산책·자연
  | 'academy'       // 학원가 심화
  | 'medical';      // 의료 심화 (종합병원)

// LifeScenario 4시점 (시간대 + 시점 강조)
export type LifeKey = 'morning' | 'afternoon' | 'weekend' | 'night';

interface HouseholdSpec {
  // 카드/섹션 본질 순서 — 가장 먼저 나올 키부터
  hookOrder: HookKey[];
  insightOrder: InsightKey[]; // 6개 슬롯에 채울 카드 키 (앞 6개만 노출)
  // 가구별 핵심 키워드 (UpsellCTAs / 추천 카드 카피에 활용)
  keyConcerns: string[];
  // CTA 카피 — "[가구]가 좋아할 단지 더 보기" 식
  ctaSuggestion: string;
}

// 카드 6개 슬롯 제한 (사용자 요청)
export const MAX_INSIGHT_CARDS = 6;

// 6개 슬롯 = 고정 4개(학군/교통/상권/인프라) + 가변 2개(가구별 다른 카드)
export const HOUSEHOLD_SPEC: Record<HouseholdType, HouseholdSpec> = {
  single: {
    // 1인가구: 통근·시세·대출 우선. 학군은 끝에.
    hookOrder: ['transit', 'price', 'mortgage', 'school'],
    // 가변: hobby + parks (취미·공원). 학군은 일반 톤으로 포함.
    insightOrder: ['transport', 'commercial', 'hobby', 'parks', 'infra', 'school'],
    keyConcerns: ['통근 동선', '야간 보안', '1인 외식·배달 상권', '취미·문화 공간'],
    ctaSuggestion: '혼자 살기 좋은 비슷한 단지 비교',
  },
  couple: {
    hookOrder: ['transit', 'price', 'mortgage', 'school'],
    // 가변: parks + hobby (둘이 산책·문화)
    insightOrder: ['transport', 'commercial', 'parks', 'hobby', 'infra', 'school'],
    keyConcerns: ['둘의 통근', '데이트·외식 상권', '한강·공원 산책', '평수와 분위기'],
    ctaSuggestion: '둘이 정주하기 좋은 비슷한 단지 비교',
  },
  newlywed: {
    hookOrder: ['transit', 'school', 'price', 'mortgage'],
    // 가변: parks + nearby (미래 가족 시설)
    insightOrder: ['transport', 'school', 'parks', 'commercial', 'infra', 'nearby'],
    keyConcerns: ['통근', '미래 자녀 학군 후보', '소아과·놀이터 인프라', '가족 친화 상권'],
    ctaSuggestion: '5~10년 뒤를 함께 견딜 단지 비교',
  },
  family_kids: {
    hookOrder: ['school', 'transit', 'price', 'mortgage'],
    // 가변: academy + nearby (학원가·비슷한 학군 단지)
    insightOrder: ['school', 'academy', 'infra', 'transport', 'nearby', 'commercial'],
    keyConcerns: ['배정 학교·통학 안전', '학원가 접근성', '소아 의료·놀이 인프라', '가족 외식 동선'],
    ctaSuggestion: '학군 좋은 비슷한 단지 비교',
  },
  school_parent: {
    hookOrder: ['school', 'price', 'transit', 'mortgage'],
    // 가변: academy + nearby
    insightOrder: ['school', 'academy', 'nearby', 'infra', 'transport', 'commercial'],
    keyConcerns: ['학원가 밀집도', '배정 명문 학교', '학원 셔틀 동선', '시세 안정성'],
    ctaSuggestion: '같은 학군 라인의 비슷한 단지 비교',
  },
  retired: {
    hookOrder: ['price', 'transit', 'mortgage', 'school'],
    // 가변: medical + parks (의료·평지 산책)
    insightOrder: ['medical', 'parks', 'commercial', 'infra', 'transport', 'school'],
    keyConcerns: ['종합병원 접근성', '평지 산책로·공원', '마트·생필품 가까움', '시세 안정'],
    ctaSuggestion: '은퇴 후 정주하기 좋은 비슷한 단지 비교',
  },
  investor: {
    hookOrder: ['price', 'mortgage', 'transit', 'school'],
    // 가변: development 우선
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
 * 가구별 6개 카드 슬롯 결정. 가구 base 순서 + 사용자 1순위 우선 + 6개로 자른다.
 * 학군 흐림 처리 X (사용자 요청). 모든 카드는 일반 톤으로 노출.
 */
export function pickInsightCardsForHousehold(
  household: HouseholdType | null | undefined,
  priorities: Priority[] | null | undefined
): InsightKey[] {
  const order = resolveInsightOrder(household, priorities);
  return order.slice(0, MAX_INSIGHT_CARDS);
}
