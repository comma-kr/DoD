import InsightCards from './InsightCards';
import RouteOptions from './RouteOptions';
import CommuteGrid from './CommuteGrid';
import NeighborhoodMap from './NeighborhoodMap';
import HookHighlights, { calcMonthlyMortgage } from './HookHighlights';
import LifeScenario from './LifeScenario';
import NearbySchoolsCard from './NearbySchoolsCard';
import CommuteFreeCard from './CommuteFreeCard';
import { getDistrictInsightsByCodeAsync, parseDistrictDong } from '@/lib/district-insights';
import { findNearbyLargeApartments } from '@/lib/nearby-apartments';
import {
  fetchNearbySchools,
  fetchWalkingRoute,
  fetchNearestStationCoord,
} from '@/lib/kakao-local';
import { getNearbyOfficialZones } from '@/lib/commercial-zones-official';
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
  // 시군구 5자리 (apartments.dong_code 앞 5자리). 광역시 충돌(중구·동구) 회피용 정확 매칭 키.
  // 옛날 리포트(content에 dongCode 없음)는 undefined → 이름 기반 fallback.
  dongCode?: string | null;
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
  const regionCode = primary.dongCode ? primary.dongCode.slice(0, 5) : null;
  const insights = await getDistrictInsightsByCodeAsync(regionCode, dong, district);

  // 좌표가 있으면 주변 데이터를 병렬 조회
  const hasCoord = primary.latitude !== null && primary.longitude !== null;

  // 1단계: 단지 주변 데이터 + 가까운 역 좌표를 병렬로
  // 상권은 SBA 공식 폴리곤(서울신용보증재단) 사용 — DBSCAN 인공 폴리곤 대신.
  const [nearby, commercialClusters, nearbySchools, stationCoord] = hasCoord
    ? await Promise.all([
        findNearbyLargeApartments(primary.id, primary.latitude!, primary.longitude!),
        getNearbyOfficialZones(primary.latitude!, primary.longitude!),
        fetchNearbySchools(primary.latitude!, primary.longitude!, { limit: 12 }),
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
      .select('price_10k, area_m2, deal_date, deal_type')
      .eq('apartment_id', primary.id)
      .order('deal_date', { ascending: false })
      .limit(40),
  ]);

  // 시세 / 평당가 / 12개월 상승률 — 직거래 제외 + outlier 자동 필터.
  // 1) 직거래 (가족 증여성) 제외
  // 2) 같은 평형(±2㎡) 그룹 중간값의 50% 이하 거래는 outlier로 제외 (잘못 매칭된 옆 단지 거래·임대 단지 거래 등)
  const allTrades = latestTradeRow.data ?? [];
  const marketTrades = allTrades.filter((t) => t.deal_type !== '직거래');
  // 같은 평형끼리 그룹 만들어 중간값 산출
  function groupMedian(area: number) {
    const peers = marketTrades.filter((t) => Math.abs(t.area_m2 - area) <= 2);
    if (peers.length < 3) return null; // 표본 적으면 필터 비활성
    const sorted = [...peers].map((t) => t.price_10k).sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  }
  const trades = marketTrades.filter((t) => {
    const median = groupMedian(t.area_m2);
    if (median === null) return true;
    return t.price_10k >= median * 0.5; // 중간값의 50% 미만이면 outlier
  });
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
        householdType={householdType}
      />

      {/* 0.5 주변 학교 초·중·고 (레벨별 가장 가까운 1곳) */}
      <NearbySchoolsCard schools={nearbySchools} />

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
        householdType={householdType}
      />

      {/* 2. 출근지 분기:
          - 'none' → "출퇴근 안 해요" 카드 (은퇴·재택·1인 등)
          - 그 외 CBD → RouteOptions (3경로 + ODSay)
          - undefined/null → 둘 다 안 띄움 (프로필 미설정) */}
      {highlightCommuteArea === 'none' ? (
        <CommuteFreeCard apartmentName={primary.name} householdType={householdType} />
      ) : highlightCommuteArea ? (
        <RouteOptions
          apartmentId={primary.id}
          district={district}
          regionCode={regionCode}
          commuteArea={highlightCommuteArea}
          apartmentLat={primary.latitude}
          apartmentLng={primary.longitude}
          workplaceAddress={workplaceAddress}
        />
      ) : null}

      {/* 3. 주요 업무지 그리드 (전체 참고) — 하단에 통근버스 한 줄 카드 포함.
          단지 좌표 있으면 ODSay 실시간 매칭, 없으면 시군구 매트릭스 fallback.
          'none'(출퇴근 안 해요) 또는 은퇴 가구는 lifestyle 모드: 헤더 톤 변경 + 셔틀 숨김. */}
      <CommuteGrid
        address={primary.address}
        regionCode={regionCode}
        apartmentId={primary.id}
        apartmentLat={primary.latitude}
        apartmentLng={primary.longitude}
        highlightArea={highlightCommuteArea ?? undefined}
        shuttles={insights.shuttles}
        lifestyleMode={highlightCommuteArea === 'none' || householdType === 'retired'}
      />

      {/* 4. 가구 형태 + 우선순위 기반 라이프 시나리오 카드.
          향후 Claude API 연동 시 generateLifeScenario(apt, profile)로 동적 생성 예정. */}
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
        priorities={priorities ?? null}
      />
    </section>
  );
}
