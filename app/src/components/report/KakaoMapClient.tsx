'use client';

// 카카오맵 JavaScript SDK 기반 지도
// 키: NEXT_PUBLIC_KAKAO_MAP_KEY (JavaScript 키)
// 레퍼런스: https://apis.map.kakao.com/web/guide/

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { KeyRound, ExternalLink } from 'lucide-react';

export interface MapPoint {
  id: string;
  type: 'current' | 'nearby' | 'station';
  name: string;
  latitude: number;
  longitude: number;
  sublabel?: string;
}

export interface WalkingRoute {
  from: { lat: number; lng: number };
  to: { lat: number; lng: number };
  distanceM: number;
  walkMin: number;
  toName: string; // 목적지 이름 (역)
  path?: Array<{ lat: number; lng: number }>; // OSRM 실제 경로. 없으면 직선
}

export interface ApartmentZone {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radius: number; // meters
  units: number;
  pricePerPyeongText?: string | null; // "8,946만원/평"
}

export interface CommercialClusterPoint {
  id: string;
  centroid: { lat: number; lng: number };
  count: number;
  polygon: Array<{ lat: number; lng: number }>;
}

export interface SchoolPoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: '초등학교' | '중학교' | '고등학교' | '학교';
  distanceM: number;
}

interface Props {
  center: { lat: number; lng: number };
  points: MapPoint[];
  walkingRoute?: WalkingRoute | null;
  apartmentZones?: ApartmentZone[];
  commercialClusters?: CommercialClusterPoint[];
  schools?: SchoolPoint[];
}

// 카카오맵 전역 선언 (dynamic script)
interface KakaoLatLng {
  getLat: () => number;
  getLng: () => number;
}
interface KakaoMap {
  setBounds: (bounds: unknown) => void;
  setCenter: (latlng: unknown) => void;
}
interface KakaoMapsNamespace {
  load: (cb: () => void) => void;
  LatLng: new (lat: number, lng: number) => KakaoLatLng;
  LatLngBounds: new () => {
    extend: (latlng: KakaoLatLng) => void;
  };
  Map: new (container: HTMLElement, options: unknown) => KakaoMap;
  CustomOverlay: new (options: unknown) => {
    setMap: (map: KakaoMap | null) => void;
  };
  Circle: new (options: unknown) => { setMap: (map: KakaoMap | null) => void };
  Polyline: new (options: unknown) => { setMap: (map: KakaoMap | null) => void };
  Polygon: new (options: unknown) => { setMap: (map: KakaoMap | null) => void };
  ZoomControl: new () => unknown;
  ControlPosition: { RIGHT: unknown };
}
interface KakaoNamespace {
  maps: KakaoMapsNamespace;
}
declare global {
  interface Window {
    kakao?: KakaoNamespace;
  }
}

const SDK_SRC_PREFIX = 'https://dapi.kakao.com/v2/maps/sdk.js';

function makeMarkerHtml(point: MapPoint): string {
  const { type, name, sublabel } = point;

  if (type === 'current') {
    return `
      <div style="
        position: relative;
        transform: translate(-50%, -100%);
        pointer-events: none;
      ">
        <div style="
          display: inline-flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          padding: 7px 13px 8px;
          background: #E25555;
          color: white;
          border-radius: 14px;
          box-shadow: 0 6px 18px rgba(226, 85, 85, 0.45), 0 2px 4px rgba(0,0,0,0.15);
          border: 2px solid white;
          white-space: nowrap;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Pretendard', sans-serif;
          min-width: 80px;
        ">
          <div style="font-size: 12px; font-weight: 700; letter-spacing: -0.2px;">${name}</div>
          ${sublabel ? `<div style="font-size: 10px; opacity: 0.9; font-weight: 500;">${sublabel}</div>` : ''}
        </div>
        <div style="
          position: absolute;
          left: 50%;
          bottom: -5px;
          transform: translateX(-50%) rotate(45deg);
          width: 11px;
          height: 11px;
          background: #C13C3C;
          border-right: 2px solid white;
          border-bottom: 2px solid white;
        "></div>
        <div style="
          position: absolute;
          left: 50%;
          top: calc(100% + 6px);
          transform: translateX(-50%);
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #C13C3C;
          border: 2px solid white;
          box-shadow: 0 0 0 2px rgba(193, 60, 60, 0.3);
        "></div>
      </div>
    `;
  }

  if (type === 'nearby') {
    return `
      <div style="transform: translate(-50%, -100%); pointer-events: none;">
        <div style="
          display: inline-flex;
          flex-direction: column;
          align-items: center;
          gap: 1px;
          padding: 5px 11px 6px;
          background: white;
          color: #1f2937;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.18), 0 1px 3px rgba(0,0,0,0.1);
          border: 1.5px solid #e5e7eb;
          white-space: nowrap;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Pretendard', sans-serif;
        ">
          <div style="font-size: 11px; font-weight: 700; letter-spacing: -0.2px;">${name}</div>
          ${sublabel ? `<div style="font-size: 9px; color: #6b7280;">${sublabel}</div>` : ''}
        </div>
      </div>
    `;
  }

  // station
  return `
    <div style="transform: translate(-50%, -50%); pointer-events: none;">
      <div style="
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 5px 10px;
        background: #059669;
        color: white;
        border-radius: 999px;
        box-shadow: 0 3px 10px rgba(5, 150, 105, 0.35);
        border: 2px solid white;
        white-space: nowrap;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Pretendard', sans-serif;
      ">
        <span style="font-size: 11px;">🚇</span>
        <span style="font-size: 10px; font-weight: 600;">${name}</span>
      </div>
    </div>
  `;
}

export default function KakaoMapClient({
  center,
  points,
  walkingRoute,
  apartmentZones,
  commercialClusters,
  schools,
}: Props) {
  const appkey = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<KakaoMap | null>(null);
  const overlaysRef = useRef<Array<{ setMap: (map: KakaoMap | null) => void }>>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing-key' | 'failed'>(
    appkey ? 'loading' : 'missing-key'
  );

  // SDK 스크립트 로드
  useEffect(() => {
    if (!appkey) {
      setStatus('missing-key');
      return;
    }

    // 8초 타임아웃: 조용한 실패 감지 (도메인 미등록·키 오류 등)
    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      setStatus((curr) => {
        if (curr === 'ready') return curr;
        console.error(
          '[KakaoMap] 8초 타임아웃 — 키 또는 도메인 등록을 확인해주세요. 현재 상태:',
          curr,
          'window.kakao:',
          typeof window !== 'undefined' ? window.kakao : 'no-window'
        );
        return 'failed';
      });
    }, 8000);

    const tryReady = () => {
      if (timedOut) return;
      if (!window.kakao) {
        console.error('[KakaoMap] script onload은 발생했지만 window.kakao가 undefined');
        setStatus('failed');
        return;
      }
      if (!window.kakao.maps) {
        console.error('[KakaoMap] window.kakao는 있지만 .maps가 없음');
        setStatus('failed');
        return;
      }
      try {
        window.kakao.maps.load(() => {
          if (timedOut) return;
          console.log('[KakaoMap] Maps SDK ready');
          clearTimeout(timeoutId);
          setStatus('ready');
        });
      } catch (err) {
        console.error('[KakaoMap] maps.load 실행 중 에러:', err);
        clearTimeout(timeoutId);
        setStatus('failed');
      }
    };

    // 이미 로드된 경우
    if (typeof window !== 'undefined' && window.kakao?.maps) {
      console.log('[KakaoMap] 이미 로드돼 있음, maps.load 호출');
      tryReady();
      return () => clearTimeout(timeoutId);
    }

    // 중복 삽입 방지
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src^="${SDK_SRC_PREFIX}"]`
    );
    if (existing) {
      console.log('[KakaoMap] 기존 스크립트 재사용');
      existing.addEventListener('load', tryReady);
      return () => {
        existing.removeEventListener('load', tryReady);
        clearTimeout(timeoutId);
      };
    }

    const script = document.createElement('script');
    script.src = `${SDK_SRC_PREFIX}?appkey=${appkey}&autoload=false&libraries=services`;
    script.async = true;
    script.onload = () => {
      console.log('[KakaoMap] script onload, window.kakao:', !!window.kakao);
      tryReady();
    };
    script.onerror = (e) => {
      console.error('[KakaoMap] script onerror:', e);
      clearTimeout(timeoutId);
      setStatus('failed');
    };
    console.log('[KakaoMap] 스크립트 삽입:', script.src);
    document.head.appendChild(script);

    return () => clearTimeout(timeoutId);
  }, [appkey]);

  // 지도 + 마커 렌더링
  useEffect(() => {
    if (status !== 'ready') return;
    if (!mapContainerRef.current || !window.kakao) return;

    const kakao = window.kakao;

    // 기존 오버레이 정리
    overlaysRef.current.forEach((o) => o.setMap(null));
    overlaysRef.current = [];

    // 맵 생성 (최초 1회)
    if (!mapRef.current) {
      mapRef.current = new kakao.maps.Map(mapContainerRef.current, {
        center: new kakao.maps.LatLng(center.lat, center.lng),
        level: 4,
      });
      mapRef.current && (mapRef.current as unknown as { addControl: (c: unknown, p: unknown) => void }).addControl?.(
        new kakao.maps.ZoomControl(),
        kakao.maps.ControlPosition.RIGHT
      );
    }

    const map = mapRef.current;

    // === 레이어 1: 상권 폴리곤 (DBSCAN 클러스터 + 호갱노노 스타일 큰 숫자) ===
    if (commercialClusters && commercialClusters.length > 0) {
      for (const c of commercialClusters) {
        // 점포 수가 많을수록 진한 색상 (호갱노노 빨강 → 우리는 주황 톤)
        const intensity = Math.min(1, c.count / 30);
        const fillOpacity = 0.25 + intensity * 0.3; // 0.25 ~ 0.55
        // 메인 코랄 색과 분리하기 위해 상권은 amber 계열로
        const fillColor = c.count >= 20 ? '#D97706' : c.count >= 10 ? '#F59E0B' : '#FBBF24';
        const strokeColor = c.count >= 20 ? '#B45309' : '#D97706';

        const polygon = new kakao.maps.Polygon({
          path: c.polygon.map((p) => new kakao.maps.LatLng(p.lat, p.lng)),
          strokeWeight: 1.5,
          strokeColor,
          strokeOpacity: 0.85,
          strokeStyle: 'solid',
          fillColor,
          fillOpacity,
        });
        polygon.setMap(map);
        overlaysRef.current.push(polygon);

        // 호갱노노식 큰 가운데 숫자
        const fontSize = c.count >= 20 ? 14 : c.count >= 10 ? 12 : 11;
        const labelHtml = `
          <div style="
            transform: translate(-50%, -50%);
            pointer-events: none;
            padding: 4px 9px;
            background: white;
            color: #92400E;
            border: 2px solid ${strokeColor};
            border-radius: 12px;
            font-size: ${fontSize}px;
            font-weight: 800;
            font-family: -apple-system, BlinkMacSystemFont, 'Pretendard', sans-serif;
            white-space: nowrap;
            box-shadow: 0 3px 10px rgba(0,0,0,0.18);
          ">${c.count}개</div>
        `;
        const label = new kakao.maps.CustomOverlay({
          position: new kakao.maps.LatLng(c.centroid.lat, c.centroid.lng),
          content: labelHtml,
          xAnchor: 0.5,
          yAnchor: 0.5,
          zIndex: 2,
        });
        label.setMap(map);
        overlaysRef.current.push(label);
      }
    }

    // === 레이어 1.5: 학교 마커 (축약: 00초/00중/00고) ===
    if (schools && schools.length > 0) {
      for (const school of schools) {
        const typeColor =
          school.type === '초등학교'
            ? '#10b981' // emerald-500
            : school.type === '중학교'
            ? '#059669' // emerald-600
            : '#047857'; // emerald-700

        // 축약: "여의도초등학교" → "여의도초"
        const shortName = school.name
          .replace(/초등학교$/, '초')
          .replace(/중학교$/, '중')
          .replace(/고등학교$/, '고')
          .replace(/고교$/, '고');

        const labelHtml = `
          <div style="
            transform: translate(-50%, -100%);
            pointer-events: none;
          ">
            <div style="
              padding: 3px 8px 4px;
              background: ${typeColor};
              color: white;
              border-radius: 999px;
              border: 2px solid white;
              font-size: 11px;
              font-weight: 800;
              font-family: -apple-system, BlinkMacSystemFont, 'Pretendard', sans-serif;
              white-space: nowrap;
              box-shadow: 0 3px 10px rgba(16, 185, 129, 0.4);
              letter-spacing: -0.3px;
            ">${shortName}</div>
          </div>
        `;
        const label = new kakao.maps.CustomOverlay({
          position: new kakao.maps.LatLng(school.lat, school.lng),
          content: labelHtml,
          xAnchor: 0.5,
          yAnchor: 1,
          zIndex: 3,
        });
        label.setMap(map);
        overlaysRef.current.push(label);
      }
    }

    // === 레이어 2: 주변 리딩단지 — 작은 점 + 단지명만 ===
    if (apartmentZones && apartmentZones.length > 0) {
      for (const zone of apartmentZones) {
        // 작은 점 + 단지명 (꼬리 없는 작은 마커)
        const dotHtml = `
          <div style="
            transform: translate(-50%, -100%);
            pointer-events: none;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 2px;
          ">
            <div style="
              padding: 3px 8px 4px;
              background: white;
              color: #C13C3C;
              border: 1.5px solid #E25555;
              border-radius: 999px;
              font-size: 10px;
              font-weight: 700;
              font-family: -apple-system, BlinkMacSystemFont, 'Pretendard', sans-serif;
              white-space: nowrap;
              box-shadow: 0 2px 6px rgba(226, 85, 85, 0.25);
              letter-spacing: -0.3px;
            ">${zone.name}</div>
            <div style="
              width: 8px;
              height: 8px;
              border-radius: 50%;
              background: #E25555;
              border: 2px solid white;
              box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
            "></div>
          </div>
        `;
        const label = new kakao.maps.CustomOverlay({
          position: new kakao.maps.LatLng(zone.lat, zone.lng),
          content: dotHtml,
          xAnchor: 0.5,
          yAnchor: 1,
          zIndex: 4,
        });
        label.setMap(map);
        overlaysRef.current.push(label);
      }
    }

    // === 레이어 3: 도보 경로 (현재 단지 → 가장 가까운 역) ===
    if (walkingRoute) {
      // OSRM path가 있으면 실제 도로 따라가는 경로, 없으면 직선
      const pathPoints = walkingRoute.path && walkingRoute.path.length > 0
        ? walkingRoute.path.map((p) => new kakao.maps.LatLng(p.lat, p.lng))
        : [
            new kakao.maps.LatLng(walkingRoute.from.lat, walkingRoute.from.lng),
            new kakao.maps.LatLng(walkingRoute.to.lat, walkingRoute.to.lng),
          ];

      const polyline = new kakao.maps.Polyline({
        path: pathPoints,
        strokeWeight: 5,
        strokeColor: '#3b82f6', // 파란
        strokeOpacity: 0.95,
        strokeStyle: 'shortdash', // 점선
      });
      polyline.setMap(map);
      overlaysRef.current.push(polyline);

      // 라벨 위치: 경로의 중간 지점
      let midLat: number, midLng: number;
      if (walkingRoute.path && walkingRoute.path.length >= 2) {
        const midIdx = Math.floor(walkingRoute.path.length / 2);
        midLat = walkingRoute.path[midIdx].lat;
        midLng = walkingRoute.path[midIdx].lng;
      } else {
        midLat = (walkingRoute.from.lat + walkingRoute.to.lat) / 2;
        midLng = (walkingRoute.from.lng + walkingRoute.to.lng) / 2;
      }
      const routeLabel = `
        <div style="
          transform: translate(-50%, -50%);
          pointer-events: none;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 5px 11px 6px 8px;
          background: linear-gradient(180deg, #60a5fa, #3b82f6);
          color: white;
          border: 2px solid white;
          border-radius: 999px;
          font-family: -apple-system, BlinkMacSystemFont, 'Pretendard', sans-serif;
          white-space: nowrap;
          box-shadow: 0 4px 14px rgba(59, 130, 246, 0.5);
        ">
          <span style="
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 22px;
            height: 22px;
            background: white;
            color: #2563eb;
            border-radius: 50%;
            font-size: 14px;
            line-height: 1;
            box-shadow: 0 1px 3px rgba(0,0,0,0.18);
          ">🚶</span>
          <span style="font-size: 12px; font-weight: 800; letter-spacing: -0.2px;">
            ${walkingRoute.toName} · ${walkingRoute.distanceM}m · ${walkingRoute.walkMin}분
          </span>
        </div>
      `;
      const label = new kakao.maps.CustomOverlay({
        position: new kakao.maps.LatLng(midLat, midLng),
        content: routeLabel,
        xAnchor: 0.5,
        yAnchor: 0.5,
        zIndex: 6,
      });
      label.setMap(map);
      overlaysRef.current.push(label);
    }

    // 반경 원 (500m / 1km) — 맨 위 (참고선)
    const circle500 = new kakao.maps.Circle({
      center: new kakao.maps.LatLng(center.lat, center.lng),
      radius: 500,
      strokeWeight: 1,
      strokeColor: '#E25555',
      strokeOpacity: 0.4,
      strokeStyle: 'dashed',
      fillColor: '#E25555',
      fillOpacity: 0.03,
    });
    circle500.setMap(map);
    overlaysRef.current.push(circle500);

    const circle1000 = new kakao.maps.Circle({
      center: new kakao.maps.LatLng(center.lat, center.lng),
      radius: 1000,
      strokeWeight: 1,
      strokeColor: '#E25555',
      strokeOpacity: 0.25,
      strokeStyle: 'dashed',
      fillColor: 'transparent',
      fillOpacity: 0,
    });
    circle1000.setMap(map);
    overlaysRef.current.push(circle1000);

    // 마커 (CustomOverlay)
    for (const point of points) {
      const overlay = new kakao.maps.CustomOverlay({
        position: new kakao.maps.LatLng(point.latitude, point.longitude),
        content: makeMarkerHtml(point),
        yAnchor: point.type === 'current' ? 1 : point.type === 'nearby' ? 1 : 0.5,
        xAnchor: 0.5,
        zIndex: point.type === 'current' ? 10 : point.type === 'station' ? 5 : 1,
      });
      overlay.setMap(map);
      overlaysRef.current.push(overlay);
    }

    // bounds 맞추기
    if (points.length > 1) {
      const bounds = new kakao.maps.LatLngBounds();
      points.forEach((p) => {
        bounds.extend(new kakao.maps.LatLng(p.latitude, p.longitude));
      });
      map.setBounds(bounds);
    } else if (points.length === 1) {
      map.setCenter(new kakao.maps.LatLng(points[0].latitude, points[0].longitude));
    }
  }, [status, center, points, walkingRoute, apartmentZones, commercialClusters, schools]);

  // UI 상태별 렌더
  if (status === 'missing-key') {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#f4f1ea] p-8">
        <div className="max-w-sm text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-warning-soft text-warning">
            <KeyRound className="h-5 w-5" />
          </div>
          <h4 className="mt-4 text-sm font-bold text-foreground">
            카카오 지도 키를 설정해주세요
          </h4>
          <p className="mt-2 text-xs leading-relaxed text-foreground-sub">
            더 정확한 한국 지도와 POI를 보시려면 카카오 개발자 계정에서
            JavaScript 키를 받아 <code className="mx-0.5 rounded bg-surface-soft px-1 py-0.5 text-[10px]">.env.local</code>에
            추가해주세요.
          </p>
          <div className="mt-4 rounded-xl bg-surface-soft p-3 text-left font-mono text-[10px] text-foreground-sub">
            NEXT_PUBLIC_KAKAO_MAP_KEY=발급받은_키
          </div>
          <Link
            href="https://developers.kakao.com/console/app"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            카카오 개발자 콘솔로 이동
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="flex h-full w-full items-center justify-center bg-surface-soft p-8">
        <div className="max-w-sm text-left">
          <div className="text-sm font-bold text-foreground">
            카카오 지도를 불러오지 못했어요
          </div>
          <p className="mt-2 text-xs text-foreground-sub">
            개발자 콘솔(F12) Console 탭에 <code className="rounded bg-surface-soft px-1">[KakaoMap]</code> 로그가 있는지 먼저 확인해주세요.
          </p>
          <div className="mt-4 rounded-lg bg-surface p-3 text-[11px] text-foreground-sub">
            <div className="font-semibold text-foreground">체크리스트</div>
            <ul className="mt-2 space-y-1.5">
              <li>
                ① <strong>JavaScript 키</strong>인지 확인 (REST API 키·Admin 키 아님)
              </li>
              <li>
                ② 카카오 개발자 콘솔 → 플랫폼 → Web →{' '}
                <strong>사이트 도메인에 <code className="rounded bg-surface-soft px-1">http://localhost:3000</code></strong> 등록
              </li>
              <li>
                ③ 도메인은 프로토콜 포함 <strong>정확한 형식</strong>이어야 함 (예: <code>http://localhost:3000</code> ✓, <code>localhost</code> ✗, <code>https://localhost:3000</code> ✗)
              </li>
              <li>
                ④ 저장 후 반영까지 <strong>1~2분</strong> 딜레이 있을 수 있음
              </li>
              <li>
                ⑤ Ad-blocker / uBlock Origin이 <code>dapi.kakao.com</code>을 차단하지 않는지
              </li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#f4f1ea]">
        <div className="flex items-center gap-2 text-xs text-foreground-sub">
          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-foreground-mute border-t-transparent" />
          카카오 지도 불러오는 중...
        </div>
      </div>
    );
  }

  return <div ref={mapContainerRef} className="h-full w-full" style={{ background: '#f4f1ea' }} />;
}
