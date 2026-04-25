'use client';

import dynamic from 'next/dynamic';
import type {
  MapPoint,
  WalkingRoute,
  ApartmentZone,
  CommercialClusterPoint,
  SchoolPoint,
} from './KakaoMapClient';
import type { DistrictInsight } from '@/lib/district-insights';
import type {
  CommercialCluster,
  NearbySchool,
  WalkingRouteResult,
  StationCoordResult,
} from '@/lib/kakao-local';
import { formatPricePerPyeong } from '@/lib/utils';

// 카카오맵 SDK는 window 의존 → 클라이언트 전용 동적 로드
const KakaoMap = dynamic(() => import('./KakaoMapClient'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#f4f1ea]">
      <span className="text-xs text-foreground-sub">카카오 지도 불러오는 중...</span>
    </div>
  ),
});

interface NearbyPoint {
  id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  distanceKm: number;
  totalUnits: number;
  pricePerPyeong?: number;
}

interface Props {
  apartmentId?: string;
  apartmentName: string;
  apartmentAddress?: string;
  apartmentLat: number;
  apartmentLng: number;
  nearby: NearbyPoint[];
  nearestStation?: string | null;
  stationDistanceM?: number | null;
  stationCoord?: StationCoordResult | null;
  insights: DistrictInsight;
  commercialClusters?: CommercialCluster[];
  nearbySchools?: NearbySchool[];
  walkingRouteResult?: WalkingRouteResult | null;
}

export default function NeighborhoodMap({
  apartmentId,
  apartmentName,
  apartmentAddress,
  apartmentLat,
  apartmentLng,
  nearby,
  nearestStation,
  stationCoord: stationCoordProp,
  insights,
  commercialClusters,
  nearbySchools,
  walkingRouteResult,
}: Props) {
  // 지도 마커 (필박): 현재 단지 + 역만
  const points: MapPoint[] = [
    {
      id: 'self',
      type: 'current',
      name: apartmentName,
      latitude: apartmentLat,
      longitude: apartmentLng,
    },
  ];

  // stationCoord: 우선 prop(라이브 카카오 결과), 없으면 nearestStation 텍스트 사용 안 함
  const stationCoord = stationCoordProp;
  if (stationCoord) {
    points.push({
      id: 'station',
      type: 'station',
      name: stationCoord.shortName,
      latitude: stationCoord.lat,
      longitude: stationCoord.lng,
      sublabel: stationCoord.line,
    });
  }
  // nearestStation prop은 문자열 형태로 다른 곳에서 사용 가능
  void nearestStation;

  // 주변 리딩단지 → 구역 (원) + 라벨
  const apartmentZones: ApartmentZone[] = nearby
    .slice(0, 5)
    .filter((n) => n.latitude !== null && n.longitude !== null)
    .map((n) => ({
      id: n.id,
      name: n.name,
      lat: n.latitude!,
      lng: n.longitude!,
      // 세대수에 따라 반경 조정: 1500세대 → 100m, 9500세대 → ~220m
      radius: Math.round(80 + Math.sqrt(n.totalUnits) * 1.4),
      units: n.totalUnits,
      pricePerPyeongText: n.pricePerPyeong
        ? formatPricePerPyeong(n.pricePerPyeong)
        : null,
    }));

  // 도보 경로 (현재 단지 → 가장 가까운 역)
  // 1순위: OSRM 실제 도로 따라가는 경로 (LocationSection이 미리 fetch)
  // 2순위: Haversine 직선
  let walkingRoute: WalkingRoute | null = null;
  if (stationCoord) {
    if (walkingRouteResult) {
      walkingRoute = {
        from: { lat: apartmentLat, lng: apartmentLng },
        to: { lat: stationCoord.lat, lng: stationCoord.lng },
        distanceM: walkingRouteResult.distanceM,
        walkMin: Math.max(1, Math.round(walkingRouteResult.durationS / 60)),
        toName: stationCoord.shortName,
        path: walkingRouteResult.path,
      };
    } else {
      // OSRM 실패 시 직선 fallback
      const toRad = (d: number) => (d * Math.PI) / 180;
      const R = 6371000;
      const dLat = toRad(stationCoord.lat - apartmentLat);
      const dLng = toRad(stationCoord.lng - apartmentLng);
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(apartmentLat)) *
          Math.cos(toRad(stationCoord.lat)) *
          Math.sin(dLng / 2) ** 2;
      const distanceM = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
      walkingRoute = {
        from: { lat: apartmentLat, lng: apartmentLng },
        to: { lat: stationCoord.lat, lng: stationCoord.lng },
        distanceM,
        walkMin: Math.max(1, Math.round(distanceM / 70)),
        toName: stationCoord.shortName,
      };
    }
  }

  // 사용 안 하는 prop는 향후 확장용 placeholder
  void apartmentAddress;
  void apartmentId;
  void insights;

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-surface/60 backdrop-blur">
      <div className="flex items-center justify-between border-b border-border bg-background/40 px-5 py-3">
        <h3 className="text-sm font-bold text-foreground">
          📍 {apartmentName} 일대
        </h3>
        <span className="text-[10px] text-foreground-sub">
          카카오맵 기반
        </span>
      </div>

      <div className="relative h-[460px] w-full">
        <KakaoMap
          center={{ lat: apartmentLat, lng: apartmentLng }}
          points={points}
          walkingRoute={walkingRoute}
          apartmentZones={apartmentZones}
          commercialClusters={(commercialClusters ?? []).map((c) => ({
            id: c.id,
            centroid: c.centroid,
            count: c.count,
            polygon: c.polygon,
          }))}
          schools={(nearbySchools ?? []).map((s) => ({
            id: s.id,
            name: s.name,
            lat: s.lat,
            lng: s.lng,
            type: s.type,
            distanceM: s.distanceM,
          }))}
        />

        {/* 우측 상단 오버레이는 제거 — 상단 HookHighlights 카드로 대체 */}

        {/* 하단 비교하기 CTA 제거됨 — 리포트 하단 UpsellCTAs로 통합 */}
      </div>

      {/* 하단 범례 */}
      <div className="flex flex-wrap items-center gap-3 border-t border-border bg-background/40 px-5 py-2.5 text-[10px] text-foreground-sub">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-foreground/20" />
          현재 단지
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-primary bg-primary/20" />
          리딩단지 ({apartmentZones.length})
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-warning bg-warning/20" />
          상권 ({commercialClusters?.length ?? 0})
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-success bg-success/20" />
          학교 ({nearbySchools?.length ?? 0})
        </span>
        {walkingRoute ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-3 bg-primary" />
            도보 {walkingRoute.distanceM}m·{walkingRoute.walkMin}분
          </span>
        ) : null}
        <span className="ml-auto">© Kakao Map</span>
      </div>
    </div>
  );
}
