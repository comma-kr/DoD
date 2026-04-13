export type HouseholdType =
  | 'single'
  | 'couple'
  | 'newlywed'
  | 'family_kids'
  | 'school_parent'
  | 'retired'
  | 'investor';

export type Priority =
  | 'transport'
  | 'school'
  | 'convenience'
  | 'quiet'
  | 'newbuild'
  | 'size'
  | 'price'
  | 'community';

export type CommuteArea =
  | 'gangnam'
  | 'yeouido'
  | 'gwanghwamun'
  | 'pangyo'
  | 'jamsil'
  | 'mapo'
  | 'seongsu'
  | 'etc'
  | 'none';

export type TransportMode = 'car' | 'transit' | 'mixed';

export interface UserProfile {
  phone: string;
  householdType: HouseholdType;
  priorities: Priority[];
  commuteArea?: CommuteArea;
  commuteAreaCustom?: string;
  workplaceAddress?: string;
  transportMode?: TransportMode;
  updatedAt?: string;
}

export const HOUSEHOLD_LABELS: Record<HouseholdType, string> = {
  single: '1인가구',
  couple: '2인가구',
  newlywed: '신혼부부',
  family_kids: '자녀 있는 가족',
  school_parent: '학군 중심 학부모',
  retired: '은퇴 부부',
  investor: '투자 목적',
};

export const HOUSEHOLD_DESCRIPTIONS: Record<HouseholdType, string> = {
  single: '혼자 살아요',
  couple: '둘이 살아요 (자녀 계획 없음)',
  newlywed: '신혼 또는 자녀 준비 중',
  family_kids: '자녀와 함께 살아요',
  school_parent: '학군·학원가가 1순위',
  retired: '은퇴 후 편안한 생활',
  investor: '실거주 아닌 참고 목적',
};

export const HOUSEHOLD_EMOJIS: Record<HouseholdType, string> = {
  single: '🧑',
  couple: '🧑‍🤝‍🧑',
  newlywed: '💑',
  family_kids: '👨‍👩‍👧',
  school_parent: '🎒',
  retired: '🌿',
  investor: '📊',
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  transport: '출퇴근 교통',
  school: '학군·학원가',
  convenience: '생활 편의',
  quiet: '조용한 환경',
  newbuild: '신축·연식',
  size: '평수·규모',
  price: '가격 안정',
  community: '커뮤니티 시설',
};

export const PRIORITY_EMOJIS: Record<Priority, string> = {
  transport: '🚇',
  school: '🏫',
  convenience: '🏪',
  quiet: '🌿',
  newbuild: '✨',
  size: '📐',
  price: '💰',
  community: '🏊',
};

export const COMMUTE_LABELS: Record<CommuteArea, string> = {
  gangnam: '강남·삼성',
  yeouido: '여의도',
  gwanghwamun: '광화문·종로',
  pangyo: '판교',
  jamsil: '잠실',
  mapo: '마포·공덕',
  seongsu: '성수',
  etc: '그 외',
  none: '재택·해당 없음',
};

export const TRANSPORT_LABELS: Record<TransportMode, string> = {
  car: '자차 위주',
  transit: '대중교통 위주',
  mixed: '상황따라',
};

export function isValidHouseholdType(v: string): v is HouseholdType {
  return [
    'single',
    'couple',
    'newlywed',
    'family_kids',
    'school_parent',
    'retired',
    'investor',
  ].includes(v);
}

export function isValidPriority(v: string): v is Priority {
  return [
    'transport',
    'school',
    'convenience',
    'quiet',
    'newbuild',
    'size',
    'price',
    'community',
  ].includes(v);
}

export function isValidCommuteArea(v: string): v is CommuteArea {
  return [
    'gangnam',
    'yeouido',
    'gwanghwamun',
    'pangyo',
    'jamsil',
    'mapo',
    'seongsu',
    'etc',
    'none',
  ].includes(v);
}
