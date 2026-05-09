// 단지 인사이트 6선 — V3 (큰 헤드라인 + 컬러 액센트 + 칩, 1순위 ★ ring)
//
// 가구별 6개 슬롯 결정은 pickInsightCardsForHousehold(household, priorities)에 위임.
// 각 카드는 { icon, label, headline, sub, chips }로 단순화.

import {
  GraduationCap,
  Train,
  ShoppingBag,
  Hospital,
  Hammer,
  Building2,
  Film,
  Trees,
  BookOpen,
  Stethoscope,
} from 'lucide-react';
import type { DistrictInsight } from '@/lib/district-insights';
import type { NearbyApartment } from '@/lib/nearby-apartments';
import type { NearbySchool } from '@/lib/kakao-local';
import type { Priority, HouseholdType } from '@/types/profile';
import { pickInsightCardsForHousehold } from '@/lib/household-priorities';

interface Props {
  apartment: {
    name: string;
    nearestStation: string | null;
    stationDistanceM: number | null;
  };
  insights: DistrictInsight;
  nearby: NearbyApartment[];
  // 학군 fallback용 — region_insights 큐레이션이 없는 권역(예: 인천 남동)에서도
  // 본문 학교 섹션과 같은 카카오 SC4 데이터를 카드에 노출해 페이지 내 모순 차단.
  nearbySchools?: NearbySchool[];
  priorities?: Priority[];
  householdType?: HouseholdType | null;
}

type Tone = 'primary' | 'success' | 'secondary' | 'danger' | 'warning';

const TONE: Record<Tone, { iconBg: string; tagBg: string; ring: string }> = {
  primary: {
    iconBg: 'bg-primary/10 text-primary',
    tagBg: 'bg-primary-soft text-primary-ink',
    ring: 'ring-primary/30',
  },
  success: {
    iconBg: 'bg-success-soft text-success',
    tagBg: 'bg-success-soft text-success',
    ring: 'ring-success/30',
  },
  secondary: {
    iconBg: 'bg-secondary/15 text-secondary',
    tagBg: 'bg-secondary/15 text-secondary',
    ring: 'ring-secondary/30',
  },
  danger: {
    iconBg: 'bg-danger-soft text-danger',
    tagBg: 'bg-danger-soft text-danger',
    ring: 'ring-danger/30',
  },
  warning: {
    iconBg: 'bg-warning-soft text-warning',
    tagBg: 'bg-warning-soft text-warning',
    ring: 'ring-warning/30',
  },
};

interface CardSpec {
  key: string;
  icon: React.ReactNode;
  label: string;
  tone: Tone;
  headline: string | null;
  sub: string | null;
  chips: string[];
  fallback: string;
}

export default function InsightCards({
  apartment,
  insights,
  nearby,
  nearbySchools,
  priorities,
  householdType,
}: Props) {
  const walkMin = apartment.stationDistanceM
    ? Math.max(1, Math.round(apartment.stationDistanceM / 70))
    : null;

  // 학군 카드 fallback — region_insights에 schoolDistrictLabel/schoolNotes 없으면
  // 본문 학교 섹션과 같은 카카오 SC4 동적 데이터로 채움. 페이지 내 모순 차단.
  const shortenSchool = (n: string) => n.replace(/등학교$/, '').replace(/학교$/, '');
  const schoolFromKakao = (() => {
    if (!nearbySchools || nearbySchools.length === 0) return null;
    const elem = nearbySchools.filter((s) => s.type === '초등학교');
    const mid = nearbySchools.filter((s) => s.type === '중학교');
    const high = nearbySchools.filter((s) => s.type === '고등학교');
    const closestElem = elem[0]?.name ?? null;
    const headline = closestElem
      ? `${shortenSchool(closestElem)} 외 도보권`
      : `반경 1.5km 내 ${nearbySchools.length}개교`;
    const sub = `초${elem.length} · 중${mid.length} · 고${high.length}`;
    const chips = [...mid.slice(0, 1), ...high.slice(0, 1)].map((s) => shortenSchool(s.name));
    return { headline, sub, chips };
  })();

  // 카드 헤드라인 결정 — region_insights 우선, 없으면 카카오 fallback, 둘 다 없으면 fallback 카피.
  const schoolHeadline = insights.schoolDistrictLabel ?? schoolFromKakao?.headline ?? null;
  const schoolSub = insights.academyCluster ?? schoolFromKakao?.sub ?? null;
  const schoolChips = insights.schoolNotes && insights.schoolNotes.length > 0
    ? insights.schoolNotes.slice(0, 2)
    : schoolFromKakao?.chips ?? [];

  // 학원가 심화 카드도 academyCluster가 없으면 학교 chips로 fallback.
  const academyHeadline = insights.academyCluster ?? schoolFromKakao?.headline ?? null;
  const academyChips = insights.schoolNotes && insights.schoolNotes.length > 0
    ? insights.schoolNotes.slice(0, 3)
    : schoolFromKakao?.chips ?? [];

  // 호재 첫번째 + 그외 — sub에는 첫번째 status·note, chips에는 다른 호재 title
  const firstDev = insights.developments?.[0] ?? null;
  const otherDevs = (insights.developments ?? []).slice(1, 4).map((d) => `${d.title} (${d.status})`);

  // 주변 대단지 — 첫번째 단지가 headline, 나머지는 chips
  const firstNearby = nearby[0] ?? null;
  const otherNearby = nearby.slice(1, 3).map((n) => `${n.name} ${n.distanceKm.toFixed(1)}km`);

  const cards: CardSpec[] = [
    {
      key: 'school',
      icon: <GraduationCap className="h-4 w-4" />,
      label: '학군',
      tone: 'success',
      headline: schoolHeadline,
      sub: schoolSub,
      chips: schoolChips,
      fallback: '반경 내 매칭된 학교 없음',
    },
    {
      key: 'transport',
      icon: <Train className="h-4 w-4" />,
      label: '교통',
      tone: 'primary',
      headline: apartment.nearestStation,
      sub: walkMin ? `도보 ${walkMin}분` : null,
      chips: [],
      fallback: '1.5km 내 매칭된 지하철역 없음',
    },
    {
      key: 'commercial',
      icon: <ShoppingBag className="h-4 w-4" />,
      label: '상권·생활권',
      tone: 'secondary',
      headline: insights.commercialArea ?? null,
      sub: insights.majorStores && insights.majorStores.length > 0
        ? `${insights.majorStores.length}개 주요 매장`
        : null,
      chips: (insights.majorStores ?? []).slice(0, 3),
      fallback: '상권 정보 준비 중',
    },
    {
      key: 'infra',
      icon: <Hospital className="h-4 w-4" />,
      label: '인프라',
      tone: 'danger',
      headline: insights.hospitals?.[0] ?? insights.parks?.[0] ?? null,
      sub:
        insights.hospitals && insights.hospitals.length > 0
          ? '병원 · 공원 도보권'
          : insights.parks && insights.parks.length > 0
          ? '공원·자연 도보권'
          : null,
      chips: [
        ...(insights.hospitals ?? []).slice(1, 2),
        ...(insights.parks ?? []).slice(0, 2),
      ],
      fallback: '인프라 정보 준비 중',
    },
    {
      key: 'development',
      icon: <Hammer className="h-4 w-4" />,
      label: '개발 호재',
      tone: 'warning',
      headline: firstDev?.title ?? null,
      sub: firstDev ? `${firstDev.status} · ${firstDev.note}` : null,
      chips: otherDevs,
      fallback: '큐레이션된 호재 없음',
    },
    {
      key: 'nearby',
      icon: <Building2 className="h-4 w-4" />,
      label: '주변 대단지',
      tone: 'primary',
      headline: firstNearby
        ? `${nearby.length}개 대단지 도보권`
        : null,
      sub: firstNearby
        ? `${firstNearby.name}${firstNearby.builtYear ? ` · ${firstNearby.builtYear}년` : ''}`
        : null,
      chips: otherNearby,
      fallback: '반경 3km 내 1,500세대 이상 없음',
    },
    // ===== 가변 슬롯 카드 4종 =====
    {
      key: 'hobby',
      icon: <Film className="h-4 w-4" />,
      label: '취미·문화',
      tone: 'primary',
      headline:
        insights.hobbySpots && insights.hobbySpots.length > 0
          ? insights.hobbySpots[0]
          : null,
      sub:
        insights.hobbySpots && insights.hobbySpots.length > 1
          ? `${insights.hobbySpots.length}개 문화 공간`
          : null,
      chips: (insights.hobbySpots ?? []).slice(1, 4),
      fallback: '영화관·서점·갤러리 정보 준비 중',
    },
    {
      key: 'parks',
      icon: <Trees className="h-4 w-4" />,
      label: '공원·산책',
      tone: 'success',
      headline: insights.parks?.[0] ?? null,
      sub:
        insights.parks && insights.parks.length > 1
          ? `${insights.parks.length}개 공원·산책로`
          : null,
      chips: (insights.parks ?? []).slice(1, 4),
      fallback: '근거리 공원·산책 코스 정보 준비 중',
    },
    {
      key: 'academy',
      icon: <BookOpen className="h-4 w-4" />,
      label: '학원가 심화',
      tone: 'warning',
      headline: academyHeadline,
      sub: insights.academyCluster ? null : (schoolFromKakao?.sub ?? null),
      chips: academyChips,
      fallback: '학원가 정보 준비 중',
    },
    {
      key: 'medical',
      icon: <Stethoscope className="h-4 w-4" />,
      label: '의료 심화',
      tone: 'danger',
      headline: insights.hospitals?.[0] ?? null,
      sub:
        insights.hospitals && insights.hospitals.length > 1
          ? `${insights.hospitals.length}개 종합병원·의료기관`
          : null,
      chips: (insights.hospitals ?? []).slice(1, 4),
      fallback: '종합병원 정보 준비 중',
    },
  ];

  // 가구별 6개 카드 슬롯 결정 (1순위가 가장 앞)
  const slotKeys = pickInsightCardsForHousehold(householdType, priorities);
  const visibleCards = slotKeys
    .map((k) => cards.find((c) => c.key === k))
    .filter((c): c is CardSpec => !!c);

  return (
    <div className="grid auto-rows-fr gap-3 break-keep sm:grid-cols-2 lg:grid-cols-3">
      {visibleCards.map((card, idx) => {
        const isTop = idx === 0;
        const t = TONE[card.tone];
        return (
          <div
            key={card.key}
            className={`flex flex-col rounded-2xl border border-border bg-surface p-5 shadow-sm ${
              isTop ? `ring-2 ${t.ring}` : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-lg ${t.iconBg}`}
              >
                {card.icon}
              </span>
              {isTop ? (
                <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold ${t.tagBg}`}>
                  ★ 1순위
                </span>
              ) : (
                <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-sub">
                  {card.label}
                </span>
              )}
            </div>
            {isTop ? (
              <div className="mt-3 text-[10px] font-bold uppercase tracking-wider text-foreground-sub">
                {card.label}
              </div>
            ) : null}
            <div
              className={`${
                isTop ? 'mt-1' : 'mt-3'
              } text-base font-extrabold leading-tight tracking-tight text-foreground`}
            >
              {card.headline ? (
                <span className="report-highlight">{card.headline}</span>
              ) : (
                <span className="text-sm font-semibold text-foreground-sub">{card.fallback}</span>
              )}
            </div>
            {card.sub ? (
              <div className="mt-1 text-[11px] text-foreground-sub">{card.sub}</div>
            ) : null}
            {card.chips.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-1">
                {card.chips.map((c, i) => (
                  <span
                    key={i}
                    className="rounded-md bg-surface-soft px-1.5 py-0.5 text-[10px] text-foreground-sub"
                  >
                    {c}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
