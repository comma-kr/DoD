// 한국부동산원 K-Apt 공동주택 정보 API 헬퍼
// 데이터포털: https://www.data.go.kr (사용자 1키 = PUBLIC_DATA_API_KEY)
// - AptListService3: 단지 목록 (시도/시군구/법정동/도로명/전체)
// - AptBasisInfoServiceV4: 단지 기본 정보 / 상세 정보

const BASE = 'https://apis.data.go.kr/1613000';

function getKey(): string {
  const raw = process.env.KAPT_API_KEY || process.env.PUBLIC_DATA_API_KEY;
  if (!raw) {
    throw new Error('PUBLIC_DATA_API_KEY (또는 KAPT_API_KEY) 환경변수가 설정되지 않았습니다');
  }
  // 사용자가 Encoding 키를 넣었을 가능성 → URL 디코드 한 번 (URLSearchParams가 다시 인코딩하므로)
  return raw.includes('%') ? decodeURIComponent(raw) : raw;
}

function buildUrl(path: string, params: Record<string, string | number>): string {
  const url = new URL(`${BASE}${path}`);
  url.searchParams.set('serviceKey', getKey());
  url.searchParams.set('_type', 'json');
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }
  return url.toString();
}

// ============================================================
// 단지 목록 (AptListService3)
// ============================================================

export interface KaptListItem {
  kaptCode: string;
  kaptName: string;
  bjdCode: string;
  as1: string;
  as2: string;
  as3: string;
  as4: string | null;
}

type KaptListItemsField =
  | KaptListItem
  | KaptListItem[]
  | { item?: KaptListItem | KaptListItem[] }
  | ''
  | null
  | undefined;

interface KaptListBody {
  items?: KaptListItemsField;
  numOfRows?: number;
  pageNo?: number;
  totalCount?: number;
}

interface KaptListResponse {
  response?: {
    body?: KaptListBody;
    header?: { resultCode?: string; resultMsg?: string };
  };
}

function normalizeItems(raw: KaptListItemsField): KaptListItem[] {
  if (raw === null || raw === undefined || raw === '') return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'object' && 'item' in raw && raw.item) {
    return Array.isArray(raw.item) ? raw.item : [raw.item];
  }
  return [raw as KaptListItem];
}

export async function fetchKaptListByLegaldong(
  bjdCode: string,
  pageNo = 1,
  numOfRows = 100
): Promise<{ items: KaptListItem[]; totalCount: number }> {
  const url = buildUrl('/AptListService3/getLegaldongAptList3', {
    bjdCode,
    pageNo,
    numOfRows,
  });

  const res = await fetch(url);
  if (!res.ok) throw new Error(`KAPT list HTTP ${res.status}`);

  const data = (await res.json()) as KaptListResponse;
  const body = data.response?.body;
  if (!body) return { items: [], totalCount: 0 };

  return {
    items: normalizeItems(body.items),
    totalCount: body.totalCount ?? 0,
  };
}

export async function fetchAllKaptByLegaldong(bjdCode: string): Promise<KaptListItem[]> {
  const all: KaptListItem[] = [];
  let pageNo = 1;
  const pageSize = 100;
  while (true) {
    const { items, totalCount } = await fetchKaptListByLegaldong(bjdCode, pageNo, pageSize);
    all.push(...items);
    if (all.length >= totalCount || items.length === 0) break;
    pageNo++;
    await new Promise((r) => setTimeout(r, 200)); // 게이트웨이 부하 완화
  }
  return all;
}

// ============================================================
// 단지 기본 정보 (AptBasisInfoServiceV4)
// ============================================================

export interface KaptBasisInfo {
  kaptCode: string;
  kaptName: string;
  kaptAddr: string; // 지번 주소
  doroJuso: string; // 도로명 주소
  codeSaleNm?: string; // 분양 형태
  codeHeatNm?: string; // 난방 방식
  codeAptNm?: string; // 단지 분류 (아파트/주상복합 등)
  kaptTarea?: number; // 대지면적 (m²)
  kaptMarea?: number; // 관리연면적
  kaptdaCnt?: number; // 세대수
  hoCnt?: number;
  kaptDongCnt?: string; // 동수 (문자열)
  kaptUsedate?: string; // 입주일 YYYYMMDD
  kaptTopFloor?: number;
  kaptBcompany?: string; // 시공사
  kaptAcompany?: string; // 건축사
  bjdCode?: string;
  zipcode?: string;
  privArea?: string; // 전용면적 합
  kaptMparea60?: number;
  kaptMparea85?: number;
  kaptMparea135?: number;
  kaptMparea136?: number;
}

interface KaptBasisResponse {
  response?: {
    body?: { item?: KaptBasisInfo };
    header?: { resultCode?: string; resultMsg?: string };
  };
}

export async function fetchKaptBasisInfo(kaptCode: string): Promise<KaptBasisInfo | null> {
  const url = buildUrl('/AptBasisInfoServiceV4/getAphusBassInfoV4', { kaptCode });

  const res = await fetch(url);
  if (!res.ok) return null;

  const data = (await res.json()) as KaptBasisResponse;
  return data.response?.body?.item ?? null;
}

// ============================================================
// 유틸
// ============================================================

export function parseUseDateYear(usedate: string | null | undefined): number | null {
  if (!usedate || usedate.length < 4) return null;
  const year = parseInt(usedate.slice(0, 4), 10);
  return isNaN(year) ? null : year;
}

// 주요 법정동 코드
export const BJD_CODES = {
  여의도동: '1156011000',
  영등포동: '1156010100',
  잠실동: '1171010800',
  대치동: '1168010600',
  반포동: '1165010800',
  목동: '1147010100',
  아현동: '1144010300',
  가락동: '1171010300',
  신천동: '1171010700',
} as const;
