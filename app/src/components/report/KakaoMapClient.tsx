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
  count: number;                 // 0이면 라벨에 표시 안 함 (공식 폴리곤 케이스)
  polygon: Array<{ lat: number; lng: number }>;
  name?: string | null;          // SBA 공식 상권명 (예: "강남역_2")
  seName?: string | null;        // 상권 종류 (발달상권/골목상권/전통시장/관광특구)
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

// noryangjin.html 디자인 시스템 차용 — 절제된 ink + terracotta accent + royal blue route.
// 둥근 pill 대신 사각 라벨(radius 3px), 이모지 대신 흰 원 + 다크 라벨, mono+sans 조합.
const MC = {
  ink: '#111418',
  inkBg: 'rgba(26,29,36,0.95)',
  inkBgLight: 'rgba(26,29,36,0.85)',
  accent2: '#A8401E',     // terracotta — 현재 단지
  accent3: '#2D5A3D',     // forest — 학교
  route: '#0070CA',       // royal blue — 도보 경로
  white: '#FFFFFF',
  // 상권 종류별 색상 (헤일 패밀리 분리: red-orange / yellow / blue / gray)
  commDense: '#A8401E',   // 밀집상권 — terracotta (red-orange)
  commMarket: '#B89B3E',  // 전통시장 — mustard (yellow-green) — terracotta와 hue family 분리
  commTour: '#1F3A5F',    // 관광특구 — deep navy
  commAlley: '#6B7280',   // 골목상권 — neutral gray
};
const FONT_MONO = "'IBM Plex Mono','Noto Sans KR',ui-monospace,SFMono-Regular,Menlo,monospace";
const FONT_SANS = "'Noto Sans KR',-apple-system,BlinkMacSystemFont,Pretendard,sans-serif";

function makeMarkerHtml(point: MapPoint): string {
  const { type, name, sublabel } = point;

  // 라벨(위) + 흰 점(아래). 점이 정확히 lat/lng에 위치하도록
  // CustomOverlay yAnchor=1로 컨텐츠 하단을 좌표에 고정.
  // 컨텐츠 내부에는 transform 안 씀 — 이중 앵커 방지.
  if (type === 'current') {
    return `
      <div style="display:flex;flex-direction:column;align-items:center;gap:3px;pointer-events:none;">
        <div style="
          background:${MC.accent2};
          color:#fff;
          font-family:${FONT_SANS};
          font-size:13px;
          font-weight:700;
          letter-spacing:-0.2px;
          padding:5px 12px;
          border-radius:3px;
          white-space:nowrap;
          box-shadow:0 3px 10px rgba(168,64,30,0.35),0 0 0 1px rgba(255,255,255,0.15) inset;
        ">${name}${sublabel ? `<span style="opacity:0.85;font-weight:500;margin-left:6px;font-size:11px;">${sublabel}</span>` : ''}</div>
        <div style="width:10px;height:10px;border-radius:50%;background:#fff;border:2px solid ${MC.accent2};box-shadow:0 1px 3px rgba(0,0,0,0.25);"></div>
      </div>
    `;
  }

  if (type === 'nearby') {
    return `
      <div style="display:flex;flex-direction:column;align-items:center;gap:2px;pointer-events:none;">
        <div style="
          background:${MC.inkBgLight};
          color:#fff;
          font-family:${FONT_SANS};
          font-size:11px;
          font-weight:600;
          letter-spacing:-0.2px;
          padding:3px 9px;
          border-radius:3px;
          white-space:nowrap;
          box-shadow:0 2px 6px rgba(0,0,0,0.2);
        ">${name}</div>
        <div style="width:6px;height:6px;border-radius:50%;background:#fff;border:1.5px solid ${MC.ink};"></div>
      </div>
    `;
  }

  // station — 라벨 + 흰 원
  return `
    <div style="display:flex;flex-direction:column;align-items:center;gap:3px;pointer-events:none;">
      <div style="
        background:${MC.inkBg};
        color:#fff;
        font-family:${FONT_SANS};
        font-size:12px;
        font-weight:600;
        padding:4px 10px;
        border-radius:3px;
        white-space:nowrap;
        box-shadow:0 2px 8px rgba(0,0,0,0.22),0 0 0 1px rgba(255,255,255,0.08) inset;
      ">${name}${sublabel ? `<span style="opacity:0.7;font-family:${FONT_MONO};font-size:10px;margin-left:6px;letter-spacing:0.04em;">${sublabel}</span>` : ''}</div>
      <div style="width:12px;height:12px;border-radius:50%;background:#fff;border:2px solid ${MC.ink};box-shadow:0 1px 3px rgba(0,0,0,0.2);"></div>
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
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

    // 맵 생성 (최초 1회) — 줌 컨트롤 미장착 (한국 정서 + 정적 리포트 톤)
    if (!mapRef.current) {
      mapRef.current = new kakao.maps.Map(mapContainerRef.current, {
        center: new kakao.maps.LatLng(center.lat, center.lng),
        level: 5, // 한 단계 축소 (숫자↑ = 축소). 단지 + 인근 상권 폴리곤 함께 잡힘
      });
    }

    const map = mapRef.current;

    // === 레이어 1: SBA 공식 상권 폴리곤 — 종류별 색상 분리 ===
    // 밀집(=발달) terracotta / 시장 amber / 관광 navy / 골목 회색.
    // 라벨은 밀집·시장·관광만 (골목은 1000+개라 노이즈 방지로 폴리곤만).
    const seConfig: Record<string, { color: string; label: string; fill: number }> = {
      '발달상권':  { color: MC.commDense,  label: '상권', fill: 0.18 },
      '전통시장':  { color: MC.commMarket, label: '시장', fill: 0.20 },
      '관광특구':  { color: MC.commTour,   label: '관광', fill: 0.18 },
    };
    if (commercialClusters && commercialClusters.length > 0) {
      for (const c of commercialClusters) {
        const cfg = c.seName ? seConfig[c.seName] : null;
        const color = cfg?.color ?? MC.commAlley;
        const fillOpacity = cfg?.fill ?? 0.08;

        const polygon = new kakao.maps.Polygon({
          path: c.polygon.map((p) => new kakao.maps.LatLng(p.lat, p.lng)),
          strokeWeight: 1.2,
          strokeColor: color,
          strokeOpacity: cfg ? 0.65 : 0.4,
          strokeStyle: 'shortdash',
          fillColor: color,
          fillOpacity,
        });
        polygon.setMap(map);
        overlaysRef.current.push(polygon);

        // 점포 수 자릿수 버킷: 1~9 / 10~99 / 100~999 / 1,000+
        const storeBucket =
          c.count > 0
            ? c.count >= 1000
              ? '1,000+개'
              : c.count >= 100
              ? `${Math.round(c.count / 100) * 100}개+`
              : c.count >= 10
              ? `${Math.round(c.count / 10) * 10}개+`
              : `${c.count}개`
            : null;

        // 라벨 구성:
        //  - 발달상권(prefix='상권'): [상권][점포 수] — 이름 생략 (행정 코드명이라 사용자에게 무의미)
        //  - 시장·관광: [prefix][이름][점포 수] — 이름이 정보적 가치 있음
        const showZoneName = cfg && cfg.label !== '상권';
        if (cfg && (c.name || cfg.label === '상권')) {
          const nameSpan = showZoneName && c.name
            ? `<span style="
                background:${MC.inkBg};
                color:#fff;
                padding:3px 8px;
                font-size:11px;
                font-weight:600;
                letter-spacing:-0.2px;
              ">${c.name}</span>`
            : '';
          const countSpan = storeBucket
            ? `<span style="
                background:${MC.inkBg};
                color:#fff;
                padding:3px 7px;
                font-family:${FONT_MONO};
                font-size:10px;
                font-weight:700;
                letter-spacing:0.04em;
                ${showZoneName ? 'border-left:1px solid rgba(255,255,255,0.2);' : ''}
              ">${storeBucket}</span>`
            : '';
          const labelHtml = `
            <div style="
              display:inline-flex;
              align-items:stretch;
              pointer-events:none;
              border-radius:3px;
              overflow:hidden;
              white-space:nowrap;
              box-shadow:0 2px 6px rgba(0,0,0,0.2);
              font-family:${FONT_SANS};
            ">
              <span style="
                background:${color};
                color:#fff;
                padding:3px 7px;
                font-family:${FONT_MONO};
                font-size:10px;
                font-weight:700;
                letter-spacing:0.04em;
              ">${cfg.label}</span>
              ${nameSpan}${countSpan}
            </div>
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
    }

    // === 레이어 1.5: 학교 마커 — forest green 단색 + 사각 라벨 ===
    // 축약: 여의도초/여의도중/여의도고. mono로 type 코드 prefix.
    if (schools && schools.length > 0) {
      for (const school of schools) {
        const shortName = school.name
          .replace(/초등학교$/, '초')
          .replace(/중학교$/, '중')
          .replace(/고등학교$/, '고')
          .replace(/고교$/, '고');

        // 초/중/고 prefix tag (mono) — noryangjin .seobu-tag 차용
        const typeCode = school.type === '초등학교' ? '초' : school.type === '중학교' ? '중' : '고';

        const labelHtml = `
          <div style="display:flex;flex-direction:column;align-items:center;gap:2px;pointer-events:none;">
            <div style="
              display:inline-flex;
              align-items:center;
              gap:0;
              background:${MC.accent3};
              color:#fff;
              border-radius:3px;
              font-family:${FONT_SANS};
              font-size:11px;
              font-weight:700;
              white-space:nowrap;
              box-shadow:0 2px 6px rgba(45,90,61,0.3);
              overflow:hidden;
            ">
              <span style="
                background:rgba(255,255,255,0.18);
                padding:3px 6px;
                font-family:${FONT_MONO};
                font-size:10px;
                font-weight:700;
                letter-spacing:0.04em;
              ">${typeCode}</span>
              <span style="padding:3px 8px;letter-spacing:-0.2px;">${shortName}</span>
            </div>
            <div style="width:6px;height:6px;border-radius:50%;background:${MC.accent3};border:1.5px solid #fff;box-shadow:0 1px 2px rgba(0,0,0,0.2);"></div>
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

    // === 레이어 2: 주변 리딩단지 — 다크 라벨 + 흰 점 (현재 단지보다 작고 절제) ===
    if (apartmentZones && apartmentZones.length > 0) {
      for (const zone of apartmentZones) {
        const dotHtml = `
          <div style="display:flex;flex-direction:column;align-items:center;gap:2px;pointer-events:none;">
            <div style="
              background:${MC.inkBgLight};
              color:#fff;
              font-family:${FONT_SANS};
              font-size:11px;
              font-weight:600;
              letter-spacing:-0.2px;
              padding:3px 9px;
              border-radius:3px;
              white-space:nowrap;
              box-shadow:0 2px 6px rgba(0,0,0,0.2);
            ">${zone.name}</div>
            <div style="width:7px;height:7px;border-radius:50%;background:#fff;border:1.5px solid ${MC.ink};"></div>
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

    // === 레이어 3: 도보 경로 — royal blue 점선 + mono 라벨 (noryangjin .route-label) ===
    if (walkingRoute) {
      const pathPoints = walkingRoute.path && walkingRoute.path.length > 0
        ? walkingRoute.path.map((p) => new kakao.maps.LatLng(p.lat, p.lng))
        : [
            new kakao.maps.LatLng(walkingRoute.from.lat, walkingRoute.from.lng),
            new kakao.maps.LatLng(walkingRoute.to.lat, walkingRoute.to.lng),
          ];

      const polyline = new kakao.maps.Polyline({
        path: pathPoints,
        strokeWeight: 3,
        strokeColor: MC.route,
        strokeOpacity: 0.9,
        strokeStyle: 'shortdash',
      });
      polyline.setMap(map);
      overlaysRef.current.push(polyline);

      // 경로 중간 지점에 라벨
      let midLat: number, midLng: number;
      if (walkingRoute.path && walkingRoute.path.length >= 2) {
        const midIdx = Math.floor(walkingRoute.path.length / 2);
        midLat = walkingRoute.path[midIdx].lat;
        midLng = walkingRoute.path[midIdx].lng;
      } else {
        midLat = (walkingRoute.from.lat + walkingRoute.to.lat) / 2;
        midLng = (walkingRoute.from.lng + walkingRoute.to.lng) / 2;
      }
      // 라벨 컨테이너 — margin-bottom으로 경로 선과 8px 간격 띄움 (yAnchor=1 기준 살짝 위로)
      const routeLabel = `
        <div style="margin-bottom:8px;pointer-events:none;">
          <div style="
            background:${MC.route};
            color:#fff;
            font-family:${FONT_MONO};
            font-size:10px;
            font-weight:700;
            letter-spacing:0.04em;
            padding:4px 9px;
            border:1.5px solid #fff;
            white-space:nowrap;
            box-shadow:0 2px 6px rgba(0,0,0,0.3);
          ">${walkingRoute.toName} · ${walkingRoute.distanceM}m · 도보 ${walkingRoute.walkMin}분</div>
        </div>
      `;
      const label = new kakao.maps.CustomOverlay({
        position: new kakao.maps.LatLng(midLat, midLng),
        content: routeLabel,
        xAnchor: 0.5,
        yAnchor: 1, // 컨텐츠 하단이 경로 중간점에 닿음 → 라벨은 경로 위로 띄워짐
        zIndex: 6,
      });
      label.setMap(map);
      overlaysRef.current.push(label);
    }

    // 반경 원 (500m / 1km) — ink 다크 점선 (terracotta 살짝 섞어 절제)
    const circle500 = new kakao.maps.Circle({
      center: new kakao.maps.LatLng(center.lat, center.lng),
      radius: 500,
      strokeWeight: 1,
      strokeColor: MC.ink,
      strokeOpacity: 0.25,
      strokeStyle: 'dashed',
      fillColor: MC.accent2,
      fillOpacity: 0.02,
    });
    circle500.setMap(map);
    overlaysRef.current.push(circle500);

    const circle1000 = new kakao.maps.Circle({
      center: new kakao.maps.LatLng(center.lat, center.lng),
      radius: 1000,
      strokeWeight: 1,
      strokeColor: MC.ink,
      strokeOpacity: 0.15,
      strokeStyle: 'dashed',
      fillColor: 'transparent',
      fillOpacity: 0,
    });
    circle1000.setMap(map);
    overlaysRef.current.push(circle1000);

    // 마커 (CustomOverlay) — 모두 yAnchor=1 (컨텐츠 하단 = 흰 점 = 좌표)
    for (const point of points) {
      const overlay = new kakao.maps.CustomOverlay({
        position: new kakao.maps.LatLng(point.latitude, point.longitude),
        content: makeMarkerHtml(point),
        yAnchor: 1,
        xAnchor: 0.5,
        zIndex: point.type === 'current' ? 10 : point.type === 'station' ? 5 : 1,
      });
      overlay.setMap(map);
      overlaysRef.current.push(overlay);
    }

    // 항상 현재 단지를 정중앙으로 (역·학교 마커 위치에 영향 받지 않음).
    // current 마커가 있으면 그걸, 없으면 첫 마커 또는 center prop.
    const currentPoint = points.find((p) => p.type === 'current') ?? points[0];
    if (currentPoint) {
      map.setCenter(new kakao.maps.LatLng(currentPoint.latitude, currentPoint.longitude));
    } else {
      map.setCenter(new kakao.maps.LatLng(center.lat, center.lng));
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
