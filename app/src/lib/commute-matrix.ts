// 행정구 × 주요 업무권역(CBD) 대중교통 소요시간 매트릭스
// 정확한 소요시간은 Kakao Mobility API나 실시간 교통 API가 필요하지만,
// 비용 0으로 대략적인 참고값을 제공하기 위해 수동 큐레이션한 매트릭스를 사용한다.
// 사용자에게는 "참고 기준 수치이며 실제 시간대에 따라 달라질 수 있어요"로 고지.

import type { CommuteArea } from '@/types/profile';

export interface CommuteEstimate {
  minMinutes: number;
  maxMinutes: number;
  transferCount: number;
  verdict: '최적' | '편리' | '보통' | '불편';
  description: string;
}

// 주요 CBD 7개
export const MAIN_CBDS: CommuteArea[] = [
  'gangnam',
  'yeouido',
  'gwanghwamun',
  'pangyo',
  'jamsil',
  'mapo',
  'seongsu',
];

export const CBD_LABELS: Record<CommuteArea, string> = {
  gangnam: '강남·삼성',
  yeouido: '여의도',
  gwanghwamun: '광화문·종로',
  pangyo: '판교',
  jamsil: '잠실',
  mapo: '마포·공덕',
  seongsu: '성수',
  etc: '그 외',
  none: '-',
};

const MATRIX: Record<string, Partial<Record<CommuteArea, CommuteEstimate>>> = {
  송파구: {
    gangnam: { minMinutes: 15, maxMinutes: 30, transferCount: 0, verdict: '편리', description: '2호선/8호선 환승 한 번으로 20분대 가능' },
    jamsil: { minMinutes: 5, maxMinutes: 15, transferCount: 0, verdict: '최적', description: '잠실 직결 생활권' },
    yeouido: { minMinutes: 35, maxMinutes: 55, transferCount: 1, verdict: '보통', description: '2호선 환승으로 45분 내외' },
    gwanghwamun: { minMinutes: 30, maxMinutes: 50, transferCount: 1, verdict: '보통', description: '2호선→5호선 환승' },
    pangyo: { minMinutes: 25, maxMinutes: 40, transferCount: 0, verdict: '편리', description: '8호선→신분당선 환승 또는 자차' },
    mapo: { minMinutes: 40, maxMinutes: 60, transferCount: 1, verdict: '불편', description: '환승 포함 한 시간 내외' },
    seongsu: { minMinutes: 20, maxMinutes: 35, transferCount: 0, verdict: '편리', description: '2호선 직결' },
  },
  강남구: {
    gangnam: { minMinutes: 5, maxMinutes: 15, transferCount: 0, verdict: '최적', description: '구 내부 이동' },
    jamsil: { minMinutes: 10, maxMinutes: 20, transferCount: 0, verdict: '편리', description: '2호선 직결' },
    yeouido: { minMinutes: 25, maxMinutes: 40, transferCount: 0, verdict: '편리', description: '9호선 직결' },
    gwanghwamun: { minMinutes: 25, maxMinutes: 45, transferCount: 1, verdict: '보통', description: '3호선→5호선 환승' },
    pangyo: { minMinutes: 20, maxMinutes: 35, transferCount: 0, verdict: '편리', description: '신분당선 직결' },
    mapo: { minMinutes: 30, maxMinutes: 45, transferCount: 1, verdict: '보통', description: '환승 1회' },
    seongsu: { minMinutes: 15, maxMinutes: 25, transferCount: 0, verdict: '편리', description: '2호선 직결' },
  },
  서초구: {
    gangnam: { minMinutes: 5, maxMinutes: 20, transferCount: 0, verdict: '최적', description: '3호선/9호선 직결' },
    pangyo: { minMinutes: 20, maxMinutes: 35, transferCount: 0, verdict: '편리', description: '신분당선 직결' },
    yeouido: { minMinutes: 25, maxMinutes: 40, transferCount: 0, verdict: '편리', description: '9호선 한 번으로' },
    gwanghwamun: { minMinutes: 30, maxMinutes: 50, transferCount: 1, verdict: '보통', description: '환승 1회 포함' },
    jamsil: { minMinutes: 20, maxMinutes: 35, transferCount: 1, verdict: '편리', description: '2호선 환승' },
    mapo: { minMinutes: 30, maxMinutes: 45, transferCount: 1, verdict: '보통', description: '환승 1회' },
    seongsu: { minMinutes: 25, maxMinutes: 40, transferCount: 1, verdict: '보통', description: '환승 1회' },
  },
  마포구: {
    yeouido: { minMinutes: 10, maxMinutes: 20, transferCount: 0, verdict: '최적', description: '5호선 직결' },
    gwanghwamun: { minMinutes: 10, maxMinutes: 25, transferCount: 0, verdict: '최적', description: '5호선 직결' },
    gangnam: { minMinutes: 30, maxMinutes: 45, transferCount: 1, verdict: '보통', description: '환승 1회 포함' },
    jamsil: { minMinutes: 35, maxMinutes: 50, transferCount: 1, verdict: '보통', description: '2호선 환승' },
    seongsu: { minMinutes: 20, maxMinutes: 35, transferCount: 0, verdict: '편리', description: '6호선 직결' },
    pangyo: { minMinutes: 45, maxMinutes: 65, transferCount: 2, verdict: '불편', description: '환승 2회 필요' },
    mapo: { minMinutes: 5, maxMinutes: 15, transferCount: 0, verdict: '최적', description: '구 내부 이동' },
  },
  영등포구: {
    yeouido: { minMinutes: 5, maxMinutes: 15, transferCount: 0, verdict: '최적', description: '도보 + 5분' },
    gwanghwamun: { minMinutes: 25, maxMinutes: 40, transferCount: 0, verdict: '편리', description: '5호선 직결' },
    gangnam: { minMinutes: 30, maxMinutes: 45, transferCount: 0, verdict: '편리', description: '9호선 직결' },
    jamsil: { minMinutes: 35, maxMinutes: 55, transferCount: 1, verdict: '보통', description: '환승 1회' },
    mapo: { minMinutes: 20, maxMinutes: 35, transferCount: 1, verdict: '편리', description: '5호선 환승' },
    pangyo: { minMinutes: 40, maxMinutes: 60, transferCount: 1, verdict: '보통', description: '신분당선 환승' },
    seongsu: { minMinutes: 30, maxMinutes: 45, transferCount: 1, verdict: '보통', description: '2호선 환승' },
  },
  양천구: {
    yeouido: { minMinutes: 15, maxMinutes: 30, transferCount: 0, verdict: '편리', description: '5호선 직결' },
    gwanghwamun: { minMinutes: 30, maxMinutes: 45, transferCount: 0, verdict: '편리', description: '5호선 한 번으로' },
    gangnam: { minMinutes: 40, maxMinutes: 60, transferCount: 1, verdict: '보통', description: '환승 1회 + 시간 소요' },
    jamsil: { minMinutes: 45, maxMinutes: 65, transferCount: 1, verdict: '불편', description: '환승 + 거리' },
    mapo: { minMinutes: 25, maxMinutes: 40, transferCount: 1, verdict: '보통', description: '5호선 환승' },
    pangyo: { minMinutes: 50, maxMinutes: 70, transferCount: 2, verdict: '불편', description: '환승 2회' },
    seongsu: { minMinutes: 35, maxMinutes: 50, transferCount: 1, verdict: '보통', description: '환승 1회' },
  },
};

export function estimateCommute(
  district: string,
  commuteArea: CommuteArea | undefined
): CommuteEstimate | null {
  if (!commuteArea || commuteArea === 'none' || commuteArea === 'etc') return null;
  return MATRIX[district]?.[commuteArea] ?? null;
}

export function getCommuteGrid(district: string): Array<{
  area: CommuteArea;
  label: string;
  estimate: CommuteEstimate | null;
}> {
  return MAIN_CBDS.map((area) => ({
    area,
    label: CBD_LABELS[area],
    estimate: MATRIX[district]?.[area] ?? null,
  }));
}

export function getVerdictColor(verdict: CommuteEstimate['verdict']): string {
  switch (verdict) {
    case '최적':
      return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    case '편리':
      return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
    case '보통':
      return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    case '불편':
      return 'bg-red-500/15 text-red-400 border-red-500/30';
  }
}
