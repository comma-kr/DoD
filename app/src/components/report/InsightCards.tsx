import {
  GraduationCap,
  Train,
  ShoppingBag,
  Hospital,
  Hammer,
  Building2,
} from 'lucide-react';
import type { DistrictInsight } from '@/lib/district-insights';
import type { NearbyApartment } from '@/lib/nearby-apartments';
import { CARD_TINT, type TintTone } from '@/lib/card-tint';
import type { Priority, HouseholdType } from '@/types/profile';
import { resolveInsightOrder, isCardWeakForHousehold, type InsightKey } from '@/lib/household-priorities';

interface Props {
  apartment: {
    name: string;
    nearestStation: string | null;
    stationDistanceM: number | null;
  };
  insights: DistrictInsight;
  nearby: NearbyApartment[];
  priorities?: Priority[];
  householdType?: HouseholdType | null;
}

export default function InsightCards({ apartment, insights, nearby, priorities, householdType }: Props) {
  const walkMin = apartment.stationDistanceM
    ? Math.max(1, Math.round(apartment.stationDistanceM / 70))
    : null;

  const cards: Array<{
    key: string;
    icon: React.ReactNode;
    title: string;
    accent: string;
    tone: TintTone;
    content: React.ReactNode;
  }> = [
    {
      key: 'school',
      icon: <GraduationCap className="h-5 w-5" />,
      title: '학군',
      accent: 'text-accent bg-accent/15 border-accent/30',
      tone: 'success',
      content: (
        <div className="space-y-2">
          {insights.schoolDistrictLabel ? (
            <div className="text-sm font-semibold text-foreground">
              {insights.schoolDistrictLabel}
            </div>
          ) : null}
          {insights.academyCluster ? (
            <div className="text-xs text-foreground-sub">
              📚 {insights.academyCluster}
            </div>
          ) : null}
          {insights.schoolNotes && insights.schoolNotes.length > 0 ? (
            <ul className="mt-2 space-y-1 text-xs text-foreground-sub">
              {insights.schoolNotes.slice(0, 2).map((n, i) => (
                <li key={i}>· {n}</li>
              ))}
            </ul>
          ) : null}
          {!insights.schoolDistrictLabel && !insights.academyCluster ? (
            <div className="text-xs text-foreground-sub">
              학교알리미에서 배정 확인
            </div>
          ) : null}
        </div>
      ),
    },
    {
      key: 'transport',
      icon: <Train className="h-5 w-5" />,
      title: '교통',
      accent: 'text-primary bg-primary-soft border-primary/30',
      tone: 'primary',
      content: (
        <div className="space-y-2">
          {apartment.nearestStation ? (
            <>
              <div className="text-sm font-semibold text-foreground">
                {apartment.nearestStation}
              </div>
              <div className="text-xs text-foreground-sub">
                {walkMin ? `도보 ${walkMin}분` : ''}
              </div>
            </>
          ) : (
            <div className="text-xs text-foreground-sub">
              주변 역 정보는 카카오맵에서 확인
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'commercial',
      icon: <ShoppingBag className="h-5 w-5" />,
      title: '상권·생활권',
      accent: 'text-secondary bg-secondary/15 border-secondary/30',
      tone: 'primary',
      content: (
        <div className="space-y-2">
          {insights.commercialArea ? (
            <div className="text-sm font-semibold text-foreground">
              {insights.commercialArea}
            </div>
          ) : null}
          {insights.majorStores && insights.majorStores.length > 0 ? (
            <div className="flex flex-wrap gap-1 pt-1">
              {insights.majorStores.slice(0, 3).map((store) => (
                <span
                  key={store}
                  className="rounded-md bg-surface-soft px-2 py-0.5 text-[11px] text-foreground-sub"
                >
                  {store}
                </span>
              ))}
            </div>
          ) : null}
          {!insights.commercialArea ? (
            <div className="text-xs text-foreground-sub">상권 정보 준비 중</div>
          ) : null}
        </div>
      ),
    },
    {
      key: 'infra',
      icon: <Hospital className="h-5 w-5" />,
      title: '인프라',
      accent: 'text-danger bg-danger-soft border-danger/30',
      tone: 'danger',
      content: (
        <div className="space-y-2">
          {insights.hospitals && insights.hospitals.length > 0 ? (
            <div>
              <div className="text-[11px] uppercase tracking-wide text-foreground-sub">
                병원
              </div>
              <div className="text-sm text-foreground">
                {insights.hospitals.slice(0, 2).join(', ')}
              </div>
            </div>
          ) : null}
          {insights.parks && insights.parks.length > 0 ? (
            <div>
              <div className="text-[11px] uppercase tracking-wide text-foreground-sub">
                공원·자연
              </div>
              <div className="text-sm text-foreground">
                {insights.parks.slice(0, 3).join(', ')}
              </div>
            </div>
          ) : null}
          {!insights.hospitals && !insights.parks ? (
            <div className="text-xs text-foreground-sub">인프라 정보 준비 중</div>
          ) : null}
        </div>
      ),
    },
    {
      key: 'development',
      icon: <Hammer className="h-5 w-5" />,
      title: '개발 호재',
      accent: 'text-warning bg-warning-soft border-warning/30',
      tone: 'warning',
      content: (
        <div className="space-y-2">
          {insights.developments && insights.developments.length > 0 ? (
            <ul className="space-y-2">
              {insights.developments.slice(0, 3).map((d, i) => (
                <li key={i} className="text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-foreground">{d.title}</span>
                    <span
                      className={`rounded-md border px-1.5 py-0.5 text-[10px] ${
                        d.status === '완료'
                          ? 'border-success/30 bg-success-soft text-success'
                          : d.status === '진행중'
                          ? 'border-warning/30 bg-warning-soft text-warning'
                          : 'border-border bg-surface-soft text-foreground-sub'
                      }`}
                    >
                      {d.status}
                    </span>
                  </div>
                  <div className="mt-0.5 text-foreground-sub">{d.note}</div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-xs text-foreground-sub">
              큐레이션된 호재 없음
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'nearby',
      icon: <Building2 className="h-5 w-5" />,
      title: '주변 대단지',
      accent: 'text-primary bg-primary/15 border-primary/30',
      tone: 'primary',
      content: (
        <div className="space-y-2">
          {nearby.length > 0 ? (
            <ul className="space-y-1.5">
              {nearby.map((n) => (
                <li key={n.id} className="text-xs">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-semibold text-foreground">{n.name}</span>
                    <span className="shrink-0 text-[10px] text-foreground-sub">
                      {n.distanceKm.toFixed(1)}km
                    </span>
                  </div>
                  <div className="text-[11px] text-foreground-sub">
                    {n.totalUnits.toLocaleString()}세대
                    {n.builtYear ? ` · ${n.builtYear}년` : ''}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-xs text-foreground-sub">
              반경 3km 내 1,500세대 이상 없음
            </div>
          )}
        </div>
      ),
    },
  ];

  // 가구 본질 우선순위 + 사용자 1순위로 카드 정렬
  const order = resolveInsightOrder(householdType, priorities);
  cards.sort((a, b) => {
    const ai = order.indexOf(a.key as InsightKey);
    const bi = order.indexOf(b.key as InsightKey);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  return (
    <div className="grid auto-rows-fr gap-3 break-keep sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card, idx) => {
        const isTop = idx === 0;
        const isWeak = isCardWeakForHousehold(householdType, card.key as InsightKey);
        return (
        <div
          key={card.key}
          className={`flex flex-col rounded-2xl border border-border bg-surface p-5 shadow-sm ${CARD_TINT[card.tone]} ${
            isTop ? 'ring-2 ring-primary/30' : ''
          } ${isWeak ? 'opacity-60' : ''}`}
        >
          <div className="mb-4 flex items-center gap-2">
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${card.accent}`}
            >
              {card.icon}
            </span>
            <h3 className="text-sm font-bold text-foreground">{card.title}</h3>
            {isTop ? (
              <span className="ml-auto rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-bold text-primary-ink">
                ★ 가장 먼저 봐주세요
              </span>
            ) : null}
            {isWeak ? (
              <span className="ml-auto rounded-full bg-surface-soft px-2 py-0.5 text-[10px] text-foreground-sub">
                참고용
              </span>
            ) : null}
          </div>
          <div className="flex-1">{card.content}</div>
        </div>
        );
      })}
    </div>
  );
}
