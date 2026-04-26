// ODSay 대중교통 길찾기 API 래퍼
// https://lab.odsay.com/guide/serviceList — searchPubTransPathT
//
// 무료 개발 키: 일일 5,000 호출. 단지×출근지 캐시로 사실상 무한 운영 가능.
// 키 없거나 호출 실패 시 null 반환 → 호출부에서 하드코딩 매트릭스 fallback.

import type { LineCode, SubwayHop } from './subway-paths';

// ODSay subwayCode → 우리 LineCode 매핑
// (ODSay 공식 코드: https://lab.odsay.com/guide/serviceList)
const SUBWAY_CODE_TO_LINE: Record<number, LineCode> = {
  1: '1',
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  41: 'BD',   // 분당선
  42: 'SBD',  // 신분당선
  43: 'GJ',   // 경의중앙선
  44: 'AR',   // 공항철도
  46: 'BD',   // 수인분당선 (분당선과 통합 표기)
  48: 'GTXA', // GTX-A
};

export interface TransitPathResult {
  totalTimeMin: number;
  totalWalkM: number;
  paymentWon: number;
  transitCount: number;
  hops: SubwayHop[];
  firstStation: string | null;
  lastStation: string | null;
  walkToFirstMin: number;  // 단지 → 첫 탑승역 도보
  walkFromLastMin: number; // 마지막 하차역 → 도착지 도보
  raw: unknown;            // 캐시 저장용 원본
}

interface OdsaySubPath {
  trafficType: 1 | 2 | 3; // 1=지하철, 2=버스, 3=도보
  distance?: number;
  sectionTime?: number;
  startName?: string;
  endName?: string;
  lane?: Array<{ name: string; subwayCode?: number; busNo?: string }>;
  stationCount?: number;
  passStopList?: { stations: Array<{ stationName: string }> };
}

interface OdsayPath {
  pathType: number;
  info: {
    totalTime: number;
    totalWalk: number;
    payment: number;
    busTransitCount: number;
    subwayTransitCount: number;
    firstStartStation?: string;
    lastEndStation?: string;
  };
  subPath: OdsaySubPath[];
}

interface OdsayResponse {
  result?: {
    path?: OdsayPath[];
  };
  error?: { code: number; msg: string };
}

/**
 * ODSay 대중교통 길찾기 호출.
 * 좌표는 WGS84 (lat = 위도, lng = 경도).
 *
 * @returns 추천 경로 1건. 실패·키 없음·결과 없음 시 null.
 */
export async function fetchTransitPath(
  origin: { lat: number; lng: number },
  dest: { lat: number; lng: number }
): Promise<TransitPathResult | null> {
  const apiKey = process.env.ODSAY_API_KEY;
  if (!apiKey) return null;

  const url = new URL('https://api.odsay.com/v1/api/searchPubTransPathT');
  url.searchParams.set('SX', String(origin.lng));
  url.searchParams.set('SY', String(origin.lat));
  url.searchParams.set('EX', String(dest.lng));
  url.searchParams.set('EY', String(dest.lat));
  url.searchParams.set('OPT', '0');             // 0=추천, 4=최단
  url.searchParams.set('SearchPathType', '0');  // 0=종합, 1=지하철, 2=버스
  url.searchParams.set('apiKey', apiKey);

  let json: OdsayResponse;
  try {
    const res = await fetch(url.toString(), {
      // ODSay는 GET이며 캐시 가능. 단지+출근지 페어가 동일하면 동일 결과.
      next: { revalidate: 60 * 60 * 24 * 30 }, // 30일
    });
    if (!res.ok) return null;
    json = (await res.json()) as OdsayResponse;
  } catch {
    return null;
  }

  if (json.error || !json.result?.path?.length) return null;

  // 추천 경로 1건. (필요 시 사용자가 환승 선호도 따라 path[0~2] 비교 가능)
  const best = json.result.path[0];
  return parseOdsayPath(best);
}

/**
 * 같은 호출의 path[0~N] 모두 파싱해서 반환. RouteOptions의 보완 카드(alternative)에 사용.
 * pathType 분류: ODSay 명시 — 1=지하철 위주, 2=버스 위주, 3=지하철+버스 혼합.
 */
export interface PathBundle {
  primary: TransitPathResult;
  alternatives: Array<TransitPathResult & { pathType: number }>;
}
export async function fetchTransitPaths(
  origin: { lat: number; lng: number },
  dest: { lat: number; lng: number }
): Promise<PathBundle | null> {
  const apiKey = process.env.ODSAY_API_KEY;
  if (!apiKey) return null;

  const url = new URL('https://api.odsay.com/v1/api/searchPubTransPathT');
  url.searchParams.set('SX', String(origin.lng));
  url.searchParams.set('SY', String(origin.lat));
  url.searchParams.set('EX', String(dest.lng));
  url.searchParams.set('EY', String(dest.lat));
  url.searchParams.set('OPT', '0');
  url.searchParams.set('SearchPathType', '0');
  url.searchParams.set('apiKey', apiKey);

  let json: OdsayResponse;
  try {
    const res = await fetch(url.toString(), {
      next: { revalidate: 60 * 60 * 24 * 30 },
    });
    if (!res.ok) return null;
    json = (await res.json()) as OdsayResponse;
  } catch {
    return null;
  }

  if (json.error || !json.result?.path?.length) return null;

  const paths = json.result.path;
  const primary = parseOdsayPath(paths[0]);
  const alternatives = paths.slice(1).map((p) => ({
    ...parseOdsayPath(p),
    pathType: p.pathType,
  }));
  return { primary, alternatives };
}

function parseOdsayPath(p: OdsayPath): TransitPathResult {
  const hops: SubwayHop[] = [];
  let walkToFirstMin = 0;
  let walkFromLastMin = 0;

  // 지하철·버스 구간을 hop으로 변환. 도보는 hop이 아니라 시간만 기록.
  // ODSay subPath는 [도보, 지하철, 도보, 지하철, 도보, ...] 같은 시퀀스.
  let lastTransitIdx = -1;
  for (let i = 0; i < p.subPath.length; i++) {
    const seg = p.subPath[i];
    if (seg.trafficType === 1) {
      lastTransitIdx = i;
      break;
    }
  }

  // 첫 도보 (단지 → 첫 역)
  if (lastTransitIdx > 0 && p.subPath[0].trafficType === 3) {
    walkToFirstMin = p.subPath[0].sectionTime ?? 0;
  }

  // 지하철 + 버스 구간 모두 순회하면서 hop 만들기.
  // 버스는 lineCode 없음 → note에 "707번 버스 16분" 식으로 채워서 화면에 노출.
  const transitSegs = p.subPath.filter((s) => s.trafficType === 1 || s.trafficType === 2);
  transitSegs.forEach((seg, idx) => {
    const isFirst = idx === 0;
    const isLast = idx === transitSegs.length - 1;
    const lane = seg.lane?.[0] as { subwayCode?: number; busNo?: string; name?: string } | undefined;
    const lineCode = lane?.subwayCode ? SUBWAY_CODE_TO_LINE[lane.subwayCode] : undefined;

    const startName = stripStation(seg.startName ?? '');
    const endName = stripStation(seg.endName ?? '');

    // note 생성 — 지하철은 호선 + 정거장, 버스는 노선 번호 + 시간
    let noteText: string | undefined;
    if (lineCode) {
      noteText = `${laneLabel(lineCode)} ${seg.stationCount ?? 0}정거장 · ${seg.sectionTime ?? 0}분`;
    } else if (lane?.busNo) {
      noteText = `${lane.busNo}번 버스 · ${seg.sectionTime ?? 0}분`;
    } else {
      noteText = lane?.name;
    }

    // 탑승 hop
    hops.push({
      station: startName,
      lines: lineCode ? [lineCode] : [],
      role: isFirst ? 'board' : 'transfer',
      rideLine: lineCode,
      note: noteText,
    });

    // 마지막 구간이면 도착 hop도 추가
    if (isLast) {
      hops.push({
        station: endName,
        lines: lineCode ? [lineCode] : [],
        role: 'arrive',
      });
    }
  });

  return {
    totalTimeMin: p.info.totalTime,
    totalWalkM: p.info.totalWalk,
    paymentWon: p.info.payment,
    transitCount: p.info.busTransitCount + p.info.subwayTransitCount,
    hops,
    firstStation: hops[0]?.station ?? null,
    lastStation: hops[hops.length - 1]?.station ?? null,
    walkToFirstMin,
    walkFromLastMin,
    raw: p,
  };
}

function stripStation(name: string): string {
  return name.endsWith('역') ? name : `${name}역`;
}

function laneLabel(code: LineCode): string {
  if (code === 'BD') return '분당선';
  if (code === 'SBD') return '신분당선';
  if (code === 'GJ') return '경의중앙선';
  if (code === 'AR') return '공항철도';
  if (code === 'GTXA') return 'GTX-A';
  return `${code}호선`;
}
