import InsightCards from './InsightCards';
import RouteOptions from './RouteOptions';
import CommuteGrid from './CommuteGrid';
import NeighborhoodMap from './NeighborhoodMap';
import HookHighlights, { calcMonthlyMortgage } from './HookHighlights';
import LifeScenario from './LifeScenario';
import { getDistrictInsightsAsync, parseDistrictDong } from '@/lib/district-insights';
import { findNearbyLargeApartments } from '@/lib/nearby-apartments';
import {
  fetchCommercialClusters,
  fetchNearbySchools,
  fetchWalkingRoute,
  fetchNearestStationCoord,
} from '@/lib/kakao-local';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { calcPricePerPyeong } from '@/lib/utils';
import type { CommuteArea, HouseholdType, Priority } from '@/types/profile';

export interface ApartmentLocation {
  id: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  nearestStation: string | null;
  stationDistanceM: number | null;
  totalUnits?: number | null;
  builtYear?: number | null;
}

interface Props {
  apartments: ApartmentLocation[];
  highlightCommuteArea?: CommuteArea | null;
  workplaceAddress?: string | null;
  householdType?: HouseholdType | null;
  priorities?: Priority[] | null;
}

export default async function LocationSection({
  apartments,
  highlightCommuteArea,
  workplaceAddress,
  householdType,
  priorities,
}: Props) {
  if (!apartments || apartments.length === 0) return null;

  const primary = apartments[0];
  const { district, dong } = parseDistrictDong(primary.address);
  const insights = await getDistrictInsightsAsync(district, dong);

  // 좌표가 있으면 주변 데이터를 병렬 조회
  const hasCoord = primary.latitude !== null && primary.longitude !== null;

  // 1단계: 단지 주변 데이터 + 가까운 역 좌표를 병렬로
  const [nearby, commercialClusters, nearbySchools, stationCoord] = hasCoord
    ? await Promise.all([
        findNearbyLargeApartments(primary.id, primary.latitude!, primary.longitude!),
        fetchCommercialClusters(primary.latitude!, primary.longitude!),
        fetchNearbySchools(primary.latitude!, primary.longitude!),
        fetchNearestStationCoord(primary.latitude!, primary.longitude!),
      ])
    : [[], [], [], null];

  // 2단계: 가까운 역 좌표를 알았으니 OSRM 도보 경로 조회 + 최근 실거래가 1건
  const sb = createSupabaseAdminClient();
  const [walkingRouteResult, latestTradeRow] = await Promise.all([
    hasCoord && stationCoord
      ? fetchWalkingRoute(
          { lat: primary.latitude!, lng: primary.longitude! },
          { lat: stationCoord.lat, lng: stationCoord.lng }
        )
      : Promise.resolve(null),
    sb
      .from('trade_history')
      .select('price_10k, area_m2, deal_date')
      .eq('apartment_id', primary.id)
      .order('deal_date', { ascending: false })
      .limit(20),
  ]);

  // 시세 / 평당가 / 12개월 상승률 계산
  const trades = latestTradeRow.data ?? [];
  const latest = trades[0];
  const latestPrice10k = latest?.price_10k ?? null;
  const latestArea = latest?.area_m2 ?? null;
  const pricePerPyeong =
    latestPrice10k && latestArea ? calcPricePerPyeong(latestPrice10k, latestArea) : null;

  let priceDelta12m: number | null = null;
  if (latest && trades.length > 1) {
    const latestTime = new Date(latest.deal_date).getTime();
    const oneYearAgo = latestTime - 365 * 86_400_000;
    const past = trades.find(
      (t) => new Date(t.deal_date).getTime() <= oneYearAgo
    );
    if (past && past.price_10k) {
      priceDelta12m =
        Math.round(((latest.price_10k - past.price_10k) / past.price_10k) * 1000) / 10;
    }
  }

  const monthlyMortgage = latestPrice10k
    ? calcMonthlyMortgage(latestPrice10k * 0.7) // 70% 대출
    : null;

  const walkingMin = walkingRouteResult
    ? Math.max(1, Math.round(walkingRouteResult.durationS / 60))
    : null;

  const nearestSchool = nearbySchools[0] ?? null;

  return (
    <section className="space-y-5">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-bold">📍 위치와 주변</h2>
        {apartments.length > 1 ? (
          <span className="text-xs text-foreground-sub">
            · 대표 단지 ({primary.name}) 기준
          </span>
        ) : null}
      </div>

      {/* 0. 훅 하이라이트 — 시세·대출·교통·학군 4카드
          역까지 거리는 OSRM 도보 거리(지도와 동일), 학교는 nearbySchools[0](지도 첫 마커와 동일) */}
      <HookHighlights
        latestPriceM10k={latestPrice10k}
        pricePerPyeong={pricePerPyeong}
        priceDelta12m={priceDelta12m}
        monthlyMortgage={monthlyMortgage}
        nearestStation={stationCoord?.shortName ?? null}
        nearestStationDistanceM={walkingRouteResult?.distanceM ?? stationCoord?.distanceM ?? null}
        walkingMin={walkingMin}
        schoolName={nearestSchool?.name ?? null}
        schoolDistanceM={nearestSchool?.distanceM ?? null}
        totalUnits={primary.totalUnits ?? null}
        builtYear={primary.builtYear ?? null}
        priorities={priorities ?? undefined}
      />

      {/* 1. 실제 카카오 지도 + 도보 경로 + 리딩단지 구역 + 상권 클러스터 + 학교 */}
      {primary.latitude !== null && primary.longitude !== null ? (
        <NeighborhoodMap
          apartmentId={primary.id}
          apartmentName={primary.name}
          apartmentAddress={primary.address}
          apartmentLat={primary.latitude}
          apartmentLng={primary.longitude}
          nearby={nearby}
          nearestStation={primary.nearestStation}
          stationDistanceM={primary.stationDistanceM}
          stationCoord={stationCoord}
          insights={insights}
          commercialClusters={commercialClusters}
          nearbySchools={nearbySchools}
          walkingRouteResult={walkingRouteResult}
        />
      ) : null}

      {/* 2. 6개 카테고리 카드 */}
      <InsightCards
        apartment={{
          name: primary.name,
          nearestStation: primary.nearestStation,
          stationDistanceM: primary.stationDistanceM,
        }}
        insights={insights}
        nearby={nearby}
        priorities={priorities ?? undefined}
      />

      {/* 2. 내 출근지 3경로 (프로필 출근지 있을 때만) */}
      {highlightCommuteArea ? (
        <RouteOptions
          district={district}
          commuteArea={highlightCommuteArea}
          apartmentLat={primary.latitude}
          apartmentLng={primary.longitude}
          workplaceAddress={workplaceAddress}
        />
      ) : null}

      {/* 3. 주요 업무지 그리드 (전체 참고) */}
      <CommuteGrid
        address={primary.address}
        highlightArea={highlightCommuteArea ?? undefined}
      />

      {/* 4. 가구 형태별 라이프 시나리오 카드 */}
      <LifeScenario
        apartmentName={primary.name}
        totalUnits={primary.totalUnits ?? null}
        builtYear={primary.builtYear ?? null}
        walkingMin={walkingMin}
        stationName={stationCoord?.shortName ?? primary.nearestStation ?? null}
        schoolName={nearestSchool?.name ?? null}
        commercialClusterCount={commercialClusters.length}
        district={district}
        parks={insights.parks ?? []}
        householdType={householdType}
      />
    </section>
  );
}
