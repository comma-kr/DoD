// 지하철 경로 데이터 — 행정구 × 주요 업무권역 매트릭스
// 출근지까지 지하철 경로를 "출발역 → (환승역) → 도착역" 시퀀스로 표현.
// 호선 색상은 서울교통공사·코레일 공식 컬러 스펙을 따른다 (한국인 정서 + 시인성).

import type { CommuteArea } from '@/types/profile';

export type LineCode =
  | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'
  | 'BD' // 분당·수인분당
  | 'SBD' // 신분당
  | 'GJ' // 경의중앙
  | 'AR' // 공항철도
  | 'GTXA';

// 호선별 (배경, 글자) 색상 — 서울 지하철 공식 컬러
export const LINE_COLOR: Record<LineCode, { bg: string; fg: string; label: string }> = {
  '1':  { bg: '#0052A4', fg: '#FFFFFF', label: '1' },
  '2':  { bg: '#00A84D', fg: '#FFFFFF', label: '2' },
  '3':  { bg: '#EF7C1C', fg: '#FFFFFF', label: '3' },
  '4':  { bg: '#00A4E3', fg: '#FFFFFF', label: '4' },
  '5':  { bg: '#996CAC', fg: '#FFFFFF', label: '5' },
  '6':  { bg: '#CD7C2F', fg: '#FFFFFF', label: '6' },
  '7':  { bg: '#747F00', fg: '#FFFFFF', label: '7' },
  '8':  { bg: '#E6186C', fg: '#FFFFFF', label: '8' },
  '9':  { bg: '#BDB092', fg: '#1A1D24', label: '9' },
  BD:   { bg: '#FABE00', fg: '#1A1D24', label: '분당' },
  SBD:  { bg: '#D4003B', fg: '#FFFFFF', label: '신분당' },
  GJ:   { bg: '#77C4A3', fg: '#FFFFFF', label: '경의' },
  AR:   { bg: '#0090D2', fg: '#FFFFFF', label: '공항' },
  GTXA: { bg: '#9A6292', fg: '#FFFFFF', label: 'GTX-A' },
};

export interface SubwayHop {
  station: string;        // '잠실역'
  lines: LineCode[];      // 해당 역에 정차하는 호선 태그
  role: 'board' | 'transfer' | 'arrive';
  rideLine?: LineCode;    // 이 hop에서 다음 hop까지 타고 가는 호선
  note?: string;          // '급행' '8정거장' 등 보조 설명
}


// 매트릭스: district × commuteArea → 지하철 경로
const SUBWAY_PATHS: Record<string, Partial<Record<CommuteArea, SubwayHop[]>>> = {
  송파구: {
    gangnam: [
      { station: '잠실역', lines: ['2', '8'], role: 'board', rideLine: '2', note: '2호선 직결' },
      { station: '강남역', lines: ['2', 'SBD'], role: 'arrive' },
    ],
    yeouido: [
      { station: '잠실역', lines: ['2', '8'], role: 'board', rideLine: '2' },
      { station: '동작역', lines: ['4', '9'], role: 'transfer', rideLine: '9', note: '9호선 환승' },
      { station: '여의도역', lines: ['5', '9'], role: 'arrive' },
    ],
    gwanghwamun: [
      { station: '잠실역', lines: ['2', '8'], role: 'board', rideLine: '2' },
      { station: '을지로4가역', lines: ['2', '5'], role: 'transfer', rideLine: '5', note: '5호선 환승' },
      { station: '광화문역', lines: ['5'], role: 'arrive' },
    ],
    pangyo: [
      { station: '잠실역', lines: ['2', '8'], role: 'board', rideLine: '2' },
      { station: '강남역', lines: ['2', 'SBD'], role: 'transfer', rideLine: 'SBD', note: '신분당선 환승' },
      { station: '판교역', lines: ['SBD', 'GTXA'], role: 'arrive' },
    ],
    seongsu: [
      { station: '잠실역', lines: ['2', '8'], role: 'board', rideLine: '2', note: '2호선 직결' },
      { station: '성수역', lines: ['2'], role: 'arrive' },
    ],
  },
  강남구: {
    yeouido: [
      { station: '신논현역', lines: ['9', 'SBD'], role: 'board', rideLine: '9', note: '9호선 직결' },
      { station: '여의도역', lines: ['5', '9'], role: 'arrive' },
    ],
    jamsil: [
      { station: '강남역', lines: ['2', 'SBD'], role: 'board', rideLine: '2', note: '2호선 직결' },
      { station: '잠실역', lines: ['2', '8'], role: 'arrive' },
    ],
    gwanghwamun: [
      { station: '강남역', lines: ['2', 'SBD'], role: 'board', rideLine: '2' },
      { station: '을지로4가역', lines: ['2', '5'], role: 'transfer', rideLine: '5', note: '5호선 환승' },
      { station: '광화문역', lines: ['5'], role: 'arrive' },
    ],
    pangyo: [
      { station: '강남역', lines: ['2', 'SBD'], role: 'board', rideLine: 'SBD', note: '신분당선 직결' },
      { station: '판교역', lines: ['SBD', 'GTXA'], role: 'arrive' },
    ],
    seongsu: [
      { station: '강남역', lines: ['2', 'SBD'], role: 'board', rideLine: '2', note: '2호선 직결' },
      { station: '성수역', lines: ['2'], role: 'arrive' },
    ],
  },
  서초구: {
    gangnam: [
      { station: '교대역', lines: ['2', '3'], role: 'board', rideLine: '2', note: '한 정거장' },
      { station: '강남역', lines: ['2', 'SBD'], role: 'arrive' },
    ],
    yeouido: [
      { station: '고속터미널역', lines: ['3', '7', '9'], role: 'board', rideLine: '9', note: '9호선 직결' },
      { station: '여의도역', lines: ['5', '9'], role: 'arrive' },
    ],
    jamsil: [
      { station: '교대역', lines: ['2', '3'], role: 'board', rideLine: '2' },
      { station: '잠실역', lines: ['2', '8'], role: 'arrive' },
    ],
    gwanghwamun: [
      { station: '고속터미널역', lines: ['3', '7', '9'], role: 'board', rideLine: '3' },
      { station: '종로3가역', lines: ['1', '3', '5'], role: 'transfer', rideLine: '5', note: '5호선 환승' },
      { station: '광화문역', lines: ['5'], role: 'arrive' },
    ],
    pangyo: [
      { station: '양재역', lines: ['3', 'SBD'], role: 'board', rideLine: 'SBD', note: '신분당선 직결' },
      { station: '판교역', lines: ['SBD', 'GTXA'], role: 'arrive' },
    ],
    seongsu: [
      { station: '교대역', lines: ['2', '3'], role: 'board', rideLine: '2', note: '2호선 직결' },
      { station: '성수역', lines: ['2'], role: 'arrive' },
    ],
  },
  마포구: {
    yeouido: [
      { station: '공덕역', lines: ['5', '6', 'GJ', 'AR'], role: 'board', rideLine: '5', note: '5호선 직결' },
      { station: '여의도역', lines: ['5', '9'], role: 'arrive' },
    ],
    gwanghwamun: [
      { station: '공덕역', lines: ['5', '6', 'GJ', 'AR'], role: 'board', rideLine: '5', note: '5호선 직결' },
      { station: '광화문역', lines: ['5'], role: 'arrive' },
    ],
    gangnam: [
      { station: '공덕역', lines: ['5', '6', 'GJ', 'AR'], role: 'board', rideLine: '6' },
      { station: '합정역', lines: ['2', '6'], role: 'transfer', rideLine: '2', note: '2호선 환승' },
      { station: '강남역', lines: ['2', 'SBD'], role: 'arrive' },
    ],
    jamsil: [
      { station: '공덕역', lines: ['5', '6', 'GJ', 'AR'], role: 'board', rideLine: '6' },
      { station: '합정역', lines: ['2', '6'], role: 'transfer', rideLine: '2', note: '2호선 환승' },
      { station: '잠실역', lines: ['2', '8'], role: 'arrive' },
    ],
    seongsu: [
      { station: '공덕역', lines: ['5', '6', 'GJ', 'AR'], role: 'board', rideLine: '6', note: '6호선 직결' },
      { station: '성수역', lines: ['2'], role: 'arrive', note: '6호선 → 성수 인근' },
    ],
    pangyo: [
      { station: '공덕역', lines: ['5', '6', 'GJ', 'AR'], role: 'board', rideLine: '5' },
      { station: '강남역', lines: ['2', 'SBD'], role: 'transfer', rideLine: 'SBD', note: '신분당선 환승' },
      { station: '판교역', lines: ['SBD', 'GTXA'], role: 'arrive' },
    ],
  },
  영등포구: {
    gangnam: [
      { station: '여의도역', lines: ['5', '9'], role: 'board', rideLine: '9', note: '9호선 급행' },
      { station: '신논현역', lines: ['9', 'SBD'], role: 'arrive', note: '강남권 진입' },
    ],
    gwanghwamun: [
      { station: '여의도역', lines: ['5', '9'], role: 'board', rideLine: '5', note: '5호선 직결' },
      { station: '광화문역', lines: ['5'], role: 'arrive' },
    ],
    yeouido: [
      { station: '영등포구청역', lines: ['2', '5'], role: 'board', rideLine: '5', note: '5호선 한 정거장' },
      { station: '여의도역', lines: ['5', '9'], role: 'arrive' },
    ],
    jamsil: [
      { station: '영등포구청역', lines: ['2', '5'], role: 'board', rideLine: '2', note: '2호선 직결' },
      { station: '잠실역', lines: ['2', '8'], role: 'arrive' },
    ],
    seongsu: [
      { station: '영등포구청역', lines: ['2', '5'], role: 'board', rideLine: '2', note: '2호선 직결' },
      { station: '성수역', lines: ['2'], role: 'arrive' },
    ],
    pangyo: [
      { station: '여의도역', lines: ['5', '9'], role: 'board', rideLine: '9', note: '9호선 급행' },
      { station: '신논현역', lines: ['9', 'SBD'], role: 'transfer', rideLine: 'SBD', note: '신분당선 환승' },
      { station: '판교역', lines: ['SBD', 'GTXA'], role: 'arrive' },
    ],
  },
  양천구: {
    yeouido: [
      { station: '오목교역', lines: ['5'], role: 'board', rideLine: '5', note: '5호선 직결' },
      { station: '여의도역', lines: ['5', '9'], role: 'arrive' },
    ],
    gwanghwamun: [
      { station: '오목교역', lines: ['5'], role: 'board', rideLine: '5', note: '5호선 직결' },
      { station: '광화문역', lines: ['5'], role: 'arrive' },
    ],
    gangnam: [
      { station: '오목교역', lines: ['5'], role: 'board', rideLine: '5' },
      { station: '여의도역', lines: ['5', '9'], role: 'transfer', rideLine: '9', note: '9호선 급행 환승' },
      { station: '신논현역', lines: ['9', 'SBD'], role: 'arrive' },
    ],
    jamsil: [
      { station: '오목교역', lines: ['5'], role: 'board', rideLine: '5' },
      { station: '을지로4가역', lines: ['2', '5'], role: 'transfer', rideLine: '2', note: '2호선 환승' },
      { station: '잠실역', lines: ['2', '8'], role: 'arrive' },
    ],
    seongsu: [
      { station: '오목교역', lines: ['5'], role: 'board', rideLine: '5' },
      { station: '을지로4가역', lines: ['2', '5'], role: 'transfer', rideLine: '2', note: '2호선 환승' },
      { station: '성수역', lines: ['2'], role: 'arrive' },
    ],
    pangyo: [
      { station: '오목교역', lines: ['5'], role: 'board', rideLine: '5' },
      { station: '여의도역', lines: ['5', '9'], role: 'transfer', rideLine: '9', note: '9호선 환승' },
      { station: '신논현역', lines: ['9', 'SBD'], role: 'transfer', rideLine: 'SBD', note: '신분당 환승' },
      { station: '판교역', lines: ['SBD', 'GTXA'], role: 'arrive' },
    ],
  },
  성동구: {
    gangnam: [
      { station: '왕십리역', lines: ['2', '5', 'GJ', 'BD'], role: 'board', rideLine: 'BD', note: '분당선 직결' },
      { station: '선릉역', lines: ['2', 'BD'], role: 'arrive', note: '강남권 진입' },
    ],
    jamsil: [
      { station: '성수역', lines: ['2'], role: 'board', rideLine: '2', note: '2호선 직결' },
      { station: '잠실역', lines: ['2', '8'], role: 'arrive' },
    ],
    gwanghwamun: [
      { station: '왕십리역', lines: ['2', '5', 'GJ', 'BD'], role: 'board', rideLine: '5', note: '5호선 직결' },
      { station: '광화문역', lines: ['5'], role: 'arrive' },
    ],
    yeouido: [
      { station: '왕십리역', lines: ['2', '5', 'GJ', 'BD'], role: 'board', rideLine: '5', note: '5호선 직결' },
      { station: '여의도역', lines: ['5', '9'], role: 'arrive' },
    ],
    pangyo: [
      { station: '왕십리역', lines: ['2', '5', 'GJ', 'BD'], role: 'board', rideLine: 'BD' },
      { station: '정자역', lines: ['BD', 'SBD'], role: 'transfer', rideLine: 'SBD', note: '신분당 환승' },
      { station: '판교역', lines: ['SBD', 'GTXA'], role: 'arrive' },
    ],
  },
  동작구: {
    yeouido: [
      { station: '노량진역', lines: ['1', '9'], role: 'board', rideLine: '9', note: '9호선 1정거장' },
      { station: '여의도역', lines: ['5', '9'], role: 'arrive' },
    ],
    gangnam: [
      { station: '노량진역', lines: ['1', '9'], role: 'board', rideLine: '9', note: '9호선 급행' },
      { station: '신논현역', lines: ['9', 'SBD'], role: 'arrive' },
    ],
    gwanghwamun: [
      { station: '노량진역', lines: ['1', '9'], role: 'board', rideLine: '1', note: '1호선 직결' },
      { station: '시청역', lines: ['1', '2'], role: 'arrive', note: '광화문 도보권' },
    ],
    jamsil: [
      { station: '사당역', lines: ['2', '4'], role: 'board', rideLine: '2', note: '2호선 직결' },
      { station: '잠실역', lines: ['2', '8'], role: 'arrive' },
    ],
    seongsu: [
      { station: '사당역', lines: ['2', '4'], role: 'board', rideLine: '2', note: '2호선 직결' },
      { station: '성수역', lines: ['2'], role: 'arrive' },
    ],
    pangyo: [
      { station: '노량진역', lines: ['1', '9'], role: 'board', rideLine: '9', note: '9호선 급행' },
      { station: '신논현역', lines: ['9', 'SBD'], role: 'transfer', rideLine: 'SBD', note: '신분당 환승' },
      { station: '판교역', lines: ['SBD', 'GTXA'], role: 'arrive' },
    ],
  },
};

export function getSubwayPath(
  district: string,
  commuteArea: CommuteArea | null | undefined
): SubwayHop[] | null {
  if (!commuteArea || commuteArea === 'none' || commuteArea === 'etc') return null;
  return SUBWAY_PATHS[district]?.[commuteArea] ?? null;
}
