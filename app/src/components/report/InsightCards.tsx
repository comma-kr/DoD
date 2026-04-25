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

interface Props {
  apartment: {
    name: string;
    nearestStation: string | null;
    stationDistanceM: number | null;
  };
  insights: DistrictInsight;
  nearby: NearbyApartment[];
}

export default function InsightCards({ apartment, insights, nearby }: Props) {
  const walkMin = apartment.stationDistanceM
    ? Math.max(1, Math.round(apartment.stationDistanceM / 70))
    : null;

  const cards: Array<{
    key: string;
    icon: React.ReactNode;
    title: string;
    accent: string;
    content: React.ReactNode;
  }> = [
    {
      key: 'school',
      icon: <GraduationCap className="h-5 w-5" />,
      title: '학군',
      accent: 'text-accent bg-accent/15 border-accent/30',
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
              학구 정보는 학교알리미에서 확인해보세요
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
      content: (
        <div className="space-y-2">
          {apartment.nearestStation ? (
            <>
              <div className="text-sm font-semibold text-foreground">
                {apartment.nearestStation}
              </div>
              <div className="text-xs text-foreground-sub">
                {apartment.stationDistanceM ? `${apartment.stationDistanceM}m` : ''}
                {walkMin ? ` · 도보 약 ${walkMin}분` : ''}
              </div>
            </>
          ) : (
            <div className="text-xs text-foreground-sub">
              주변 역 정보는 카카오맵으로 확인해보세요
            </div>
          )}
          <div className="pt-1 text-[11px] text-foreground-sub">
            주요 업무지 소요시간은 아래 그리드에서 확인하실 수 있어요
          </div>
        </div>
      ),
    },
    {
      key: 'commercial',
      icon: <ShoppingBag className="h-5 w-5" />,
      title: '상권·생활권',
      accent: 'text-secondary bg-secondary/15 border-secondary/30',
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
            <div className="text-xs text-foreground-sub">
              상권 정보가 아직 큐레이션되지 않았어요
            </div>
          ) : null}
        </div>
      ),
    },
    {
      key: 'infra',
      icon: <Hospital className="h-5 w-5" />,
      title: '인프라',
      accent: 'text-danger bg-danger-soft border-danger/30',
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
            <div className="text-xs text-foreground-sub">
              인프라 정보가 아직 큐레이션되지 않았어요
            </div>
          ) : null}
        </div>
      ),
    },
    {
      key: 'development',
      icon: <Hammer className="h-5 w-5" />,
      title: '개발 호재',
      accent: 'text-warning bg-warning-soft border-warning/30',
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
              현재 큐레이션된 개발 호재 정보가 없어요
            </div>
          )}
          <div className="pt-1 text-[10px] text-foreground-sub">
            ※ 일반 공공 정보이며, 투자 판단이 아닙니다
          </div>
        </div>
      ),
    },
    {
      key: 'nearby',
      icon: <Building2 className="h-5 w-5" />,
      title: '주변 대단지',
      accent: 'text-primary bg-primary/15 border-primary/30',
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
              반경 3km 내 1,500세대 이상 단지가 시드에 없어요
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <div
          key={card.key}
          className="rounded-2xl border border-border bg-surface p-5 shadow-sm"
        >
          <div className="mb-4 flex items-center gap-2">
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-xl border ${card.accent}`}
            >
              {card.icon}
            </span>
            <h3 className="text-sm font-bold text-foreground">{card.title}</h3>
          </div>
          {card.content}
        </div>
      ))}
    </div>
  );
}
