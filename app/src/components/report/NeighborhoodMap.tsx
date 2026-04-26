'use client';

import { useState } from 'react';
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
  NearbySchool,
  WalkingRouteResult,
  StationCoordResult,
} from '@/lib/kakao-local';
import type { OfficialZone } from '@/lib/commercial-zones-official';
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
  commercialClusters?: OfficialZone[];
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

  // 범례 항목 토글 — 사용자가 보고 싶은 레이어만 켜기. 디폴트 모두 ON.
  // 현재 단지·도보 경로는 제외 (출처 명확, 토글 불필요).
  const [visible, setVisible] = useState({
    nearby: true,
    commercial: true,
    school: true,
    station: true,
  });
  const toggle = (key: keyof typeof visible) =>
    setVisible((v) => ({ ...v, [key]: !v[key] }));

  // 토글 OFF인 레이어는 빈 배열 또는 필터링해서 KakaoMap에 전달
  const filteredPoints = points.filter((p) => {
    if (p.type === 'station') return visible.station;
    return true; // current 단지는 항상
  });
  const filteredApartmentZones = visible.nearby ? apartmentZones : [];
  const filteredCommercial = visible.commercial ? (commercialClusters ?? []) : [];
  const filteredSchools = visible.school ? (nearbySchools ?? []) : [];

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-surface shadow-sm">
      {/* 지도 + 범례 오버레이 (상단 메타 바 제거) */}
      <div className="map-frame-wrap relative h-[460px] w-full">
        <KakaoMap
          center={{ lat: apartmentLat, lng: apartmentLng }}
          points={filteredPoints}
          walkingRoute={visible.station ? walkingRoute : null}
          apartmentZones={filteredApartmentZones}
          commercialClusters={filteredCommercial.map((c) => ({
            id: c.id,
            centroid: c.centroid,
            count: c.count,
            polygon: c.polygon,
            name: c.name,
            seName: c.seName,
          }))}
          schools={filteredSchools.map((s) => ({
            id: s.id,
            name: s.name,
            lat: s.lat,
            lng: s.lng,
            type: s.type,
            distanceM: s.distanceM,
          }))}
        />

        {/* 좌측 하단 범례 박스 — 클릭하면 토글. 디폴트 모두 ON. 현재 단지·도보 경로는 토글 X. */}
        <div className="absolute bottom-4 left-4 z-[500] max-w-[340px] border border-border bg-surface/97 px-3.5 py-3 text-[11px] shadow-md backdrop-blur-sm">
          <div className="grid grid-cols-2 gap-x-3.5 gap-y-1.5">
            <div className="flex items-center gap-2 text-foreground">
              <span className="inline-block h-3 w-3" style={{ background: '#A8401E' }} aria-hidden />
              <span>현재 단지</span>
            </div>
            <button
              type="button"
              onClick={() => toggle('nearby')}
              className={`flex items-center gap-2 text-left transition ${visible.nearby ? 'text-foreground' : 'text-foreground-sub opacity-40 line-through'}`}
              aria-pressed={visible.nearby}
            >
              <span className="inline-block h-3 w-3" style={{ background: 'rgba(26,29,36,0.85)' }} aria-hidden />
              <span>주변단지</span>
            </button>
            <button
              type="button"
              onClick={() => toggle('commercial')}
              className={`flex items-center gap-2 text-left transition ${visible.commercial ? 'text-foreground' : 'text-foreground-sub opacity-40 line-through'}`}
              aria-pressed={visible.commercial}
            >
              <span className="inline-block h-3 w-3" style={{ background: 'rgba(168,64,30,0.22)', border: '1px dashed #A8401E' }} aria-hidden />
              <span>상권/시장/특구</span>
            </button>
            <button
              type="button"
              onClick={() => toggle('school')}
              className={`flex items-center gap-2 text-left transition ${visible.school ? 'text-foreground' : 'text-foreground-sub opacity-40 line-through'}`}
              aria-pressed={visible.school}
            >
              <span className="inline-block h-3 w-3" style={{ background: '#2D5A3D' }} aria-hidden />
              <span>학교</span>
            </button>
            <button
              type="button"
              onClick={() => toggle('station')}
              className={`flex items-center gap-2 text-left transition ${visible.station ? 'text-foreground' : 'text-foreground-sub opacity-40 line-through'}`}
              aria-pressed={visible.station}
            >
              <span
                className="inline-block h-3 w-3 rounded-full border-2"
                style={{ background: '#fff', borderColor: '#111418' }}
                aria-hidden
              />
              <span>지하철역·도보경로</span>
            </button>
          </div>
          <div className="mt-2 pt-2 border-t border-border/40 text-[9px] text-foreground-sub">
            👆 누르면 켰다 껐다
          </div>
        </div>
      </div>

      {/* 하단 캡션 — 한 줄 간결, 상권 폴리곤은 SBA 공식 출처 표시 */}
      <div className="border-t border-border bg-surface-soft px-5 py-3 text-[11.5px] leading-relaxed text-foreground-sub break-keep">
        <strong className="text-foreground">{apartmentName}</strong> 일대 위치도 — 마커 색상으로 종류 구분.
        상권 영역: <strong className="text-foreground">서울시 상권분석서비스(SBA)</strong>.
      </div>
    </div>
  );
}
