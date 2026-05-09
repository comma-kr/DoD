// 서울신용보증재단(SBA) 공식 상권 영역 폴리곤 — 단지 좌표 기반 조회.
// 데이터 출처: 서울시 상권분석서비스(영역-상권) · 공공누리 1유형
// 빌드: scripts/build-commercial-zones.mjs (SHP → WGS84 GeoJSON)

import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { CommercialClusterPoint } from '@/components/report/KakaoMapClient';

interface ZoneFeature {
  type: 'Feature';
  properties: {
    code: string | null;
    name: string | null;
    seCode: string | null;
    seName: string | null; // 골목상권 / 발달상권 / 전통시장 / 관광특구
    storeCount: number | null; // 가장 최신 분기 점포 합계 (점포-상권 데이터 없으면 null)
    centroid: [number, number] | null; // [lng, lat]
  };
  geometry:
    | { type: 'Polygon'; coordinates: number[][][] }
    | { type: 'MultiPolygon'; coordinates: number[][][][] };
}

interface ZonesGeoJson {
  features: ZoneFeature[];
}

let cached: ZonesGeoJson | null = null;

async function loadZones(): Promise<ZonesGeoJson> {
  if (cached) return cached;
  const fpath = path.join(
    process.cwd(),
    'data',
    'seoul-commercial-zones',
    'zones.geojson'
  );
  try {
    const raw = await fs.readFile(fpath, 'utf8');
    cached = JSON.parse(raw) as ZonesGeoJson;
    return cached;
  } catch {
    // 파일 없거나 파싱 실패 → 빈 데이터로 안전 fallback.
    // (.gitignore로 제외된 SBA 원본 데이터셋이 운영 빌드에 미포함되는 경우 대응)
    cached = { features: [] };
    return cached;
  }
}

// Haversine 거리 (m)
function distM(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function firstRing(geom: ZoneFeature['geometry']): number[][] {
  return geom.type === 'Polygon' ? geom.coordinates[0] : geom.coordinates[0][0];
}

// Ray-casting point-in-polygon (단일 ring). 좌표는 [lng, lat] 순서.
function pointInRing(point: [number, number], ring: number[][]): boolean {
  const [px, py] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

// Polygon/MultiPolygon 모두 처리. 한 ring이라도 안에 있으면 true.
function pointInGeom(point: [number, number], geom: ZoneFeature['geometry']): boolean {
  if (!geom) return false;
  if (geom.type === 'Polygon') {
    return pointInRing(point, geom.coordinates[0]);
  }
  if (geom.type === 'MultiPolygon') {
    return geom.coordinates.some((poly) => pointInRing(point, poly[0]));
  }
  return false;
}

export interface OfficialZone extends CommercialClusterPoint {
  name: string;
  seName: string; // 골목상권 / 발달상권 / 전통시장 / 관광특구
  distanceM: number;
}

/**
 * 단지 좌표 기준 인근 공식 상권 폴리곤을 반환.
 * 1) point-in-polygon 검사 — 단지 점이 어떤 폴리곤 안이면 distanceM=0으로 무조건 매칭
 *    (서울 SBA 발달상권은 작아 centroid가 멀어도 단지가 그 안일 수 있음. 인천/경기 행정동
 *     폴리곤은 큰 영역이라 centroid가 단지에서 3~5km 떨어져도 단지는 그 안일 수 있음)
 * 2) centroid radius 내 인접 폴리곤도 함께
 *
 * @param lat 단지 위도
 * @param lng 단지 경도
 * @param radiusM centroid 매칭 반경 (기본 3000m — 행정동 단위 cover)
 * @param limit 최대 개수 (기본 6)
 */
export async function getNearbyOfficialZones(
  lat: number,
  lng: number,
  radiusM = 3000,
  limit = 6
): Promise<OfficialZone[]> {
  const zones = await loadZones();

  type Cand = ZoneFeature & { _dist: number; _inside: boolean };
  const candidates: Cand[] = [];
  const aptPoint: [number, number] = [lng, lat];
  // 인접(non-inside) 매칭 시 점포 임계 — 행정동 시드는 storeCount=0인 외곽 동도 포함.
  // 단지가 그 안일 땐 무조건 표시(inside), 인접에선 임계 통과(>=30) 행정동만 표시.
  const NEIGHBOR_STORE_MIN = 30;
  for (const f of zones.features) {
    const c = f.properties.centroid;
    if (!c) continue;
    const [zLng, zLat] = c;
    const d = distM(lat, lng, zLat, zLng);
    const inside = pointInGeom(aptPoint, f.geometry);
    if (!inside) {
      if (d > radiusM) continue;
      // 인접 행정동은 점포 임계 통과해야 표시 (외곽 동 노이즈 차단)
      const sc = f.properties.storeCount ?? 0;
      if (sc < NEIGHBOR_STORE_MIN) continue;
    }
    candidates.push(Object.assign({}, f, { _dist: inside ? 0 : d, _inside: inside }));
  }

  // 단지 점이 안에 있는 폴리곤 우선, 그다음 발달상권/관광특구/전통시장, 마지막 골목상권
  const tierOf = (seName: string | null) => {
    if (seName === '발달상권') return 0;
    if (seName === '관광특구') return 1;
    if (seName === '전통시장') return 2;
    return 3; // 골목 + 미분류
  };
  candidates.sort((a, b) => {
    if (a._inside !== b._inside) return a._inside ? -1 : 1; // inside 우선
    const ta = tierOf(a.properties.seName);
    const tb = tierOf(b.properties.seName);
    if (ta !== tb) return ta - tb;
    return a._dist - b._dist;
  });

  const picked: OfficialZone[] = [];
  for (const f of candidates) {
    if (picked.length >= limit) break;
    const ring = firstRing(f.geometry);
    if (ring.length < 3) continue;

    const polygon = ring.map(([lon, la]) => ({ lat: la, lng: lon }));
    const [cLng, cLat] = f.properties.centroid!;

    picked.push({
      id: f.properties.code ?? `${cLng},${cLat}`,
      centroid: { lat: cLat, lng: cLng },
      count: f.properties.storeCount ?? 0, // 점포-상권 데이터 있으면 채워짐
      polygon,
      name: f.properties.name ?? '상권',
      seName: f.properties.seName ?? '상권',
      distanceM: f._dist,
    });
  }

  return picked;
}
