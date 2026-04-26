// 카카오 Local API 서버사이드 헬퍼
// REST 키: KAKAO_REST_KEY
// 사용처: LocationSection (async 서버 컴포넌트)에서 단지 좌표 기준 주변 POI 조회

const REST_KEY = process.env.KAKAO_REST_KEY;
const BASE = 'https://dapi.kakao.com/v2/local';

interface KakaoPlace {
  id: string;
  place_name: string;
  category_name: string;
  category_group_code: string;
  category_group_name: string;
  phone: string;
  address_name: string;
  road_address_name: string;
  x: string; // longitude
  y: string; // latitude
  distance: string;
}

async function searchCategory(
  code: string,
  lat: number,
  lng: number,
  radius = 800,
  size = 15,
  page = 1
): Promise<{ places: KakaoPlace[]; isEnd: boolean; totalCount: number }> {
  if (!REST_KEY) {
    return { places: [], isEnd: true, totalCount: 0 };
  }

  const url = new URL(`${BASE}/search/category.json`);
  url.searchParams.set('category_group_code', code);
  url.searchParams.set('x', String(lng));
  url.searchParams.set('y', String(lat));
  url.searchParams.set('radius', String(radius));
  url.searchParams.set('sort', 'distance');
  url.searchParams.set('size', String(size));
  url.searchParams.set('page', String(page));

  const res = await fetch(url.toString(), {
    headers: { Authorization: `KakaoAK ${REST_KEY}` },
    next: { revalidate: 60 * 60 * 24 }, // 24시간 캐시 (Next.js fetch cache)
  });

  if (!res.ok) {
    return { places: [], isEnd: true, totalCount: 0 };
  }

  const data = await res.json();
  return {
    places: data.documents ?? [],
    isEnd: data.meta?.is_end ?? true,
    totalCount: data.meta?.total_count ?? 0,
  };
}

// ============================================================
// 음식점/카페 기반 상권 폴리곤 (DBSCAN + Convex Hull)
// ============================================================

export interface LatLng {
  lat: number;
  lng: number;
}

export interface CommercialCluster {
  id: string;
  centroid: LatLng;
  count: number;
  polygon: LatLng[]; // 클러스터를 둘러싸는 다각형 (확장된 convex hull)
}

// 두 점 사이 거리 (미터, equirectangular 근사)
function distanceM(a: LatLng, b: LatLng): number {
  const lngScale = Math.cos((a.lat * Math.PI) / 180);
  const dy = (a.lat - b.lat) * 111000;
  const dx = (a.lng - b.lng) * 111000 * lngScale;
  return Math.sqrt(dy * dy + dx * dx);
}

// DBSCAN 클러스터링 — 밀도 기반
function dbscan(points: LatLng[], epsM: number, minPts: number): number[] {
  const n = points.length;
  const labels = new Array<number>(n).fill(-1); // -1: 미방문, -2: 노이즈, 0+: 클러스터 id
  let clusterId = 0;

  function regionQuery(idx: number): number[] {
    const result: number[] = [];
    for (let i = 0; i < n; i++) {
      if (i === idx) continue;
      if (distanceM(points[idx], points[i]) <= epsM) {
        result.push(i);
      }
    }
    return result;
  }

  for (let i = 0; i < n; i++) {
    if (labels[i] !== -1) continue;
    const neighbors = regionQuery(i);
    if (neighbors.length + 1 < minPts) {
      labels[i] = -2;
      continue;
    }
    labels[i] = clusterId;
    const queue = [...neighbors];
    while (queue.length > 0) {
      const q = queue.shift()!;
      if (labels[q] === -2) labels[q] = clusterId;
      if (labels[q] !== -1) continue;
      labels[q] = clusterId;
      const qNeighbors = regionQuery(q);
      if (qNeighbors.length + 1 >= minPts) {
        queue.push(...qNeighbors);
      }
    }
    clusterId++;
  }

  return labels;
}

// Andrew's monotone chain — 2D convex hull
function convexHull(pts: LatLng[]): LatLng[] {
  if (pts.length < 3) return pts.slice();
  const sorted = pts.slice().sort((a, b) => a.lng - b.lng || a.lat - b.lat);

  const cross = (o: LatLng, a: LatLng, b: LatLng) =>
    (a.lng - o.lng) * (b.lat - o.lat) - (a.lat - o.lat) * (b.lng - o.lng);

  const lower: LatLng[] = [];
  for (const p of sorted) {
    while (
      lower.length >= 2 &&
      cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0
    ) {
      lower.pop();
    }
    lower.push(p);
  }

  const upper: LatLng[] = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (
      upper.length >= 2 &&
      cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0
    ) {
      upper.pop();
    }
    upper.push(p);
  }

  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

// 폴리곤 외부로 paddingM 만큼 팽창 (centroid 기준 방사형 확장)
function expandPolygon(poly: LatLng[], paddingM: number): LatLng[] {
  if (poly.length === 0) return poly;
  const cy = poly.reduce((s, p) => s + p.lat, 0) / poly.length;
  const cx = poly.reduce((s, p) => s + p.lng, 0) / poly.length;
  const lngScale = Math.cos((cy * Math.PI) / 180);

  return poly.map((p) => {
    const dy = p.lat - cy;
    const dx = p.lng - cx;
    const lenLat = Math.abs(dy) * 111000;
    const lenLng = Math.abs(dx) * 111000 * lngScale;
    const len = Math.sqrt(lenLat * lenLat + lenLng * lenLng);
    if (len === 0) return p;
    const ratio = (len + paddingM) / len;
    return {
      lat: cy + dy * ratio,
      lng: cx + dx * ratio,
    };
  });
}

/**
 * 단지 주변 800m 내 음식점·카페를 수집해 DBSCAN 밀도 클러스터링 → convex hull 폴리곤.
 * 호갱노노 스타일 불규칙 상권 구역.
 */
export async function fetchCommercialClusters(
  lat: number,
  lng: number,
  options: { radius?: number; epsM?: number; minPts?: number } = {}
): Promise<CommercialCluster[]> {
  const radius = options.radius ?? 800;
  const epsM = options.epsM ?? 60; // DBSCAN 이웃 반경
  const minPts = options.minPts ?? 5; // 최소 클러스터 크기

  // FD6 음식점 + CE7 카페 수집
  const allPlaces: LatLng[] = [];
  for (const code of ['FD6', 'CE7']) {
    let page = 1;
    while (page <= 3) {
      const { places, isEnd } = await searchCategory(code, lat, lng, radius, 15, page);
      for (const p of places) {
        allPlaces.push({ lat: parseFloat(p.y), lng: parseFloat(p.x) });
      }
      if (isEnd) break;
      page++;
    }
  }

  if (allPlaces.length === 0) return [];

  // DBSCAN
  const labels = dbscan(allPlaces, epsM, minPts);
  const clusters = new Map<number, LatLng[]>();
  for (let i = 0; i < allPlaces.length; i++) {
    const id = labels[i];
    if (id < 0) continue;
    const list = clusters.get(id) ?? [];
    list.push(allPlaces[i]);
    clusters.set(id, list);
  }

  const result: CommercialCluster[] = [];
  for (const [id, points] of clusters.entries()) {
    const hull = convexHull(points);
    const expanded = expandPolygon(hull, 25); // 25m 외곽 패딩
    const centroid: LatLng = {
      lat: points.reduce((s, p) => s + p.lat, 0) / points.length,
      lng: points.reduce((s, p) => s + p.lng, 0) / points.length,
    };
    result.push({
      id: `cluster-${id}`,
      centroid,
      count: points.length,
      polygon: expanded,
    });
  }

  // 밀도 높은 순
  return result.sort((a, b) => b.count - a.count);
}

// ============================================================
// 학교 (SC4) 기반 가까운 학군지
// ============================================================

export interface NearbySchool {
  id: string;
  name: string;
  lat: number;
  lng: number;
  distanceM: number;
  type: '초등학교' | '중학교' | '고등학교' | '학교';
  address: string;
}

function inferSchoolType(name: string, categoryName: string): NearbySchool['type'] {
  if (name.includes('초등') || categoryName.includes('초등')) return '초등학교';
  if (name.includes('중학교') || categoryName.includes('중학교')) return '중학교';
  if (name.includes('고등학교') || name.includes('고교') || categoryName.includes('고등'))
    return '고등학교';
  return '학교';
}

/** "여의도초등학교" → "여의도초", "여의도중학교" → "여의도중" */
export function shortenSchoolName(name: string): string {
  return name
    .replace(/초등학교$/, '초')
    .replace(/중학교$/, '중')
    .replace(/고등학교$/, '고')
    .replace(/고교$/, '고')
    .replace(/특수학교$/, '특');
}

// ============================================================
// 가장 가까운 지하철역 좌표 조회 (SW8 카테고리)
// ============================================================

export interface StationCoordResult {
  name: string; // "여의나루역 5호선"
  shortName: string; // "여의나루역"
  line: string; // "5호선"
  lat: number;
  lng: number;
  distanceM: number;
}

export async function fetchNearestStationCoord(
  lat: number,
  lng: number,
  radius = 1500
): Promise<StationCoordResult | null> {
  const url = new URL(`${BASE}/search/category.json`);
  url.searchParams.set('category_group_code', 'SW8');
  url.searchParams.set('x', String(lng));
  url.searchParams.set('y', String(lat));
  url.searchParams.set('radius', String(radius));
  url.searchParams.set('sort', 'distance');
  url.searchParams.set('size', '1');

  if (!REST_KEY) return null;
  const res = await fetch(url.toString(), {
    headers: { Authorization: `KakaoAK ${REST_KEY}` },
    next: { revalidate: 60 * 60 * 24 * 7 },
  });
  if (!res.ok) return null;
  const data = await res.json();
  const top = data.documents?.[0];
  if (!top) return null;

  // place_name 형식: "여의나루역 5호선" 또는 "여의도역 9호선"
  const parts = top.place_name.split(' ');
  const shortName = parts[0]; // "여의나루역"
  const line = parts.slice(1).join(' '); // "5호선"

  return {
    name: top.place_name,
    shortName,
    line,
    lat: parseFloat(top.y),
    lng: parseFloat(top.x),
    distanceM: parseInt(top.distance, 10) || 0,
  };
}

// ============================================================
// 도보 경로 (OSRM 공개 서버, 무료, 키 불필요)
// ============================================================

export interface WalkingRouteResult {
  distanceM: number;
  durationS: number;
  path: LatLng[]; // 실제 도로 따라가는 폴리라인
}

/**
 * 단지 주변 육아 인프라 (어린이집·유치원 PS3 + 소아과/소아청소년과 keyword)
 * mock-reports의 buildSchool에서 사용. 사용자에게 "지도앱 확인" 떠넘기지 말고
 * 우리 데이터로 풀어주기 위함.
 */
export interface KidsInfra {
  daycareCount: number;       // 어린이집·유치원 (PS3 카테고리, radius 내)
  daycareSamples: string[];   // 가까운 N개 이름
  pediatricsCount: number;    // 소아과·소아청소년과
  pediatricsSamples: string[];
}
export async function fetchKidsInfra(
  lat: number,
  lng: number,
  radius = 800
): Promise<KidsInfra> {
  if (!REST_KEY) {
    return { daycareCount: 0, daycareSamples: [], pediatricsCount: 0, pediatricsSamples: [] };
  }

  // PS3 = 어린이집·유치원 (카카오 카테고리)
  const daycare = await searchCategory('PS3', lat, lng, radius, 15, 1);

  // 소아과는 카테고리 분류가 없어서 키워드 검색. HP8(병원) 안에서 이름 필터.
  const pediatrics = await searchCategory('HP8', lat, lng, radius, 15, 1);
  const pedFiltered = pediatrics.places.filter((p) => {
    const name = p.place_name ?? '';
    const cat = p.category_name ?? '';
    return /소아|어린이/.test(name) || /소아|어린이/.test(cat);
  });

  return {
    daycareCount: daycare.totalCount,
    daycareSamples: daycare.places.slice(0, 3).map((p) => p.place_name),
    pediatricsCount: pedFiltered.length,
    pediatricsSamples: pedFiltered.slice(0, 3).map((p) => p.place_name),
  };
}

/**
 * OSRM 공개 서버로 도보 경로 조회.
 * 실패 시 null → 호출자가 직선거리로 fallback.
 */
export async function fetchWalkingRoute(
  from: LatLng,
  to: LatLng
): Promise<WalkingRouteResult | null> {
  const url = `https://routing.openstreetmap.de/routed-foot/route/v1/foot/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'ipji990-app' },
      next: { revalidate: 60 * 60 * 24 * 7 }, // 1주일 캐시
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.code !== 'Ok' || !data.routes?.[0]) return null;

    const route = data.routes[0];
    const coords = route.geometry?.coordinates as Array<[number, number]>;
    if (!coords || coords.length === 0) return null;

    return {
      distanceM: Math.round(route.distance),
      durationS: Math.round(route.duration),
      path: coords.map(([lng, lat]) => ({ lat, lng })),
    };
  } catch {
    return null;
  }
}

/**
 * 단지 주변 학교 (SC4) — 초·중·고만 거리순 (유치원·학원·대학·평생교육원 제외)
 * Kakao SC4 카테고리에는 잡다한 교육기관이 섞여 있으므로 이름·카테고리로 필터링.
 */
export async function fetchNearbySchools(
  lat: number,
  lng: number,
  options: { radius?: number; limit?: number } = {}
): Promise<NearbySchool[]> {
  const radius = options.radius ?? 2000;
  const limit = options.limit ?? 6;

  // 페이지 여러 개 호출해서 충분히 모은 뒤 필터링
  const all: KakaoPlace[] = [];
  for (let page = 1; page <= 3; page++) {
    const { places, isEnd } = await searchCategory('SC4', lat, lng, radius, 15, page);
    all.push(...places);
    if (isEnd) break;
  }

  // 이름/카테고리에서 명확히 학교(초·중·고)만 통과
  const filtered = all.filter((p) => {
    const name = p.place_name;
    const cat = p.category_name ?? '';
    // 제외: 유치원, 어린이집, 학원, 대학교, 대학원, 평생교육, 사이버, 직업학교, 특수학교
    if (/유치원|어린이집|학원$|학원\s|대학교|대학원|평생교육|사이버대|직업학교|특수학교|음악학원|미술학원|학습관/.test(name + cat)) {
      return false;
    }
    // 포함: 초등학교, 중학교, 고등학교, 고교
    return /초등학교|중학교|고등학교|고교/.test(name + cat);
  });

  // Kakao distance는 문자열, 안전하게 정수 변환 후 정렬
  const sorted = filtered
    .map((p) => ({
      place: p,
      distM: parseInt(p.distance, 10) || 0,
    }))
    .sort((a, b) => a.distM - b.distM);

  return sorted.slice(0, limit).map(({ place, distM }) => ({
    id: place.id,
    name: place.place_name,
    lat: parseFloat(place.y),
    lng: parseFloat(place.x),
    distanceM: distM,
    type: inferSchoolType(place.place_name, place.category_name),
    address: place.road_address_name || place.address_name,
  }));
}
