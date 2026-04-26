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
  const raw = await fs.readFile(fpath, 'utf8');
  cached = JSON.parse(raw) as ZonesGeoJson;
  return cached;
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

export interface OfficialZone extends CommercialClusterPoint {
  name: string;
  seName: string; // 골목상권 / 발달상권 / 전통시장 / 관광특구
  distanceM: number;
}

/**
 * 단지 좌표 기준 인근 공식 상권 폴리곤을 반환.
 * centroid 거리순으로 정렬, 발달상권 우선, 너무 작은(골목) 상권은 거리에 패널티.
 *
 * @param lat 단지 위도
 * @param lng 단지 경도
 * @param radiusM 반경 (기본 1500m)
 * @param limit 최대 개수 (기본 6)
 */
export async function getNearbyOfficialZones(
  lat: number,
  lng: number,
  radiusM = 1500,
  limit = 6
): Promise<OfficialZone[]> {
  const zones = await loadZones();

  type Cand = ZoneFeature & { _dist: number };
  const candidates: Cand[] = [];
  for (const f of zones.features) {
    const c = f.properties.centroid;
    if (!c) continue;
    const [zLng, zLat] = c;
    const d = distM(lat, lng, zLat, zLng);
    if (d > radiusM) continue;
    candidates.push(Object.assign({}, f, { _dist: d }));
  }

  // 발달상권/관광특구 우선, 그다음 전통시장, 마지막 골목상권 (다양성 확보)
  const tierOf = (seName: string | null) => {
    if (seName === '발달상권') return 0;
    if (seName === '관광특구') return 1;
    if (seName === '전통시장') return 2;
    return 3; // 골목 + 미분류
  };
  candidates.sort((a, b) => {
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
