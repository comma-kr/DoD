// 출근 경로 3가지 옵션 생성기
// 지하철 최단 / 환승 적게 / 자차 러시아워
//
// 현재는 CBD 매트릭스 + Haversine 거리 기반 추정.
// 향후 Kakao Mobility Transit/Direction API로 대체 예정.

import { estimateCommuteByCodeAsync } from './commute-matrix';
import { getSubwayPath, type SubwayHop } from './subway-paths';
import { CBD_COORDS } from './transit-path';
import type { CommuteArea } from '@/types/profile';

export type RouteMode = 'subway_fastest' | 'subway_simple' | 'car_rush';

export interface RouteOption {
  mode: RouteMode;
  label: string;
  icon: string;
  durationText: string;
  transfersText: string;
  description: string;
  note?: string;
  subwayPath?: SubwayHop[]; // 지하철 경로 hop 시퀀스 (출발→환승→도착)
}

// Haversine 거리 (km)
function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

// 자차 시간 추정: 거리 기반 + 러시아워 배수
function estimateCarTime(distanceKm: number): { min: number; max: number } {
  // 서울 평균 시내 주행 속도 20km/h (평상시) / 12km/h (러시아워)
  const normalMin = Math.round((distanceKm / 20) * 60);
  const rushMax = Math.round((distanceKm / 12) * 60);
  return {
    min: Math.max(5, normalMin),
    max: Math.max(normalMin + 5, rushMax),
  };
}

export interface GenerateOptions {
  district: string;
  regionCode?: string | null; // 광역시 충돌 회피 매칭 키 (없으면 district_name fallback)
  commuteArea: CommuteArea | null | undefined;
  apartmentLat: number | null;
  apartmentLng: number | null;
  workplaceAddress?: string | null;
}

export async function generateRouteOptions({
  district,
  regionCode,
  commuteArea,
  apartmentLat,
  apartmentLng,
  workplaceAddress,
}: GenerateOptions): Promise<RouteOption[]> {
  // 1) 프리셋 CBD가 있고 매트릭스(DB 우선)에 존재 → 매트릭스 기반 3경로
  if (commuteArea && commuteArea !== 'none' && commuteArea !== 'etc') {
    const estimate = await estimateCommuteByCodeAsync(regionCode, district, commuteArea);
    const coords = CBD_COORDS[commuteArea];

    if (estimate) {
      const options: RouteOption[] = [];

      // 1. 지하철 최단 경로
      const path = getSubwayPath(district, commuteArea) ?? undefined;
      options.push({
        mode: 'subway_fastest',
        label: '지하철 최단',
        icon: '🚇',
        durationText: `${estimate.minMinutes}분 내외`,
        transfersText:
          estimate.transferCount === 0
            ? '직결'
            : `환승 ${estimate.transferCount}회`,
        description: estimate.description,
        subwayPath: path,
      });

      // 2. 환승 적은 경로 (max 시간 + 편한 동선)
      const simpleTransfers = Math.max(0, estimate.transferCount - 1);
      options.push({
        mode: 'subway_simple',
        label: '환승 적게',
        icon: '🚌',
        durationText: `${estimate.maxMinutes}~${estimate.maxMinutes + 5}분`,
        transfersText:
          simpleTransfers === 0 ? '직결 또는 버스 병행' : `환승 ${simpleTransfers}회`,
        description:
          estimate.transferCount > 0
            ? '환승을 줄이는 대신 이동 시간이 조금 더 걸려요'
            : '버스와 지하철을 병행하는 동선이에요',
      });

      // 3. 자차 러시아워
      if (coords && apartmentLat !== null && apartmentLng !== null) {
        const km = haversineKm(apartmentLat, apartmentLng, coords.lat, coords.lng);
        const { min, max } = estimateCarTime(km);
        options.push({
          mode: 'car_rush',
          label: '자차 (러시아워)',
          icon: '🚗',
          durationText: `${min}~${max}분`,
          transfersText: `약 ${km.toFixed(1)}km`,
          description: '평상시 ~ 출퇴근 피크 시간 포함',
          note: '주차 여건은 별도 확인 필요',
        });
      } else {
        // 좌표 없음 — 매트릭스 기반 러프 추정
        options.push({
          mode: 'car_rush',
          label: '자차 (러시아워)',
          icon: '🚗',
          durationText: `${estimate.minMinutes + 5}~${estimate.maxMinutes + 15}분`,
          transfersText: '자차 이용',
          description: '평상시 ~ 출퇴근 피크 시간 포함',
          note: '주차 여건은 별도 확인 필요',
        });
      }

      return options;
    }
  }

  // 2) 매트릭스에 없지만 좌표가 있는 경우 → 자차 거리만 표시
  if (apartmentLat !== null && apartmentLng !== null && workplaceAddress) {
    return [
      {
        mode: 'subway_fastest',
        label: '대중교통',
        icon: '🚇',
        durationText: '매트릭스 데이터 없음',
        transfersText: '직접 입력 주소',
        description: '정확한 대중교통 경로는 네이버/카카오맵으로 확인해주세요',
      },
    ];
  }

  return [];
}
