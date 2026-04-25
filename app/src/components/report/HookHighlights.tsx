// 리포트 최상단 훅 하이라이트 카드
// 부동산 초보·신혼부부가 한눈에 "오 이거 봐야겠다" 느낌을 받도록
// 4개 핵심 정보를 큰 숫자 + 한 줄 설명으로 노출

import {
  TrendingUp,
  Wallet,
  Train,
  GraduationCap,
} from 'lucide-react';
import { CARD_TINT, type TintTone } from '@/lib/card-tint';

interface Props {
  // 시세
  pricePerPyeong?: number | null; // 만원/평
  latestPriceM10k?: number | null; // 만원
  priceDelta12m?: number | null; // 1년 상승률 %

  // 금융
  monthlyMortgage?: number | null; // 70% 대출 + 30년 + 4.5% 가정 시 월 납부

  // 교통
  nearestStation?: string | null;
  nearestStationDistanceM?: number | null;
  walkingMin?: number | null;

  // 학군
  schoolName?: string | null;
  schoolDistanceM?: number | null;

  // 가족 구성
  totalUnits?: number | null;
  builtYear?: number | null;
}

function formatEok(manWon: number | null | undefined): string {
  if (!manWon) return '-';
  if (manWon >= 10000) {
    const eok = Math.floor(manWon / 10000);
    const rest = manWon % 10000;
    return rest > 0
      ? `${eok}억 ${(Math.floor(rest / 100) * 100).toLocaleString()}만`
      : `${eok}억`;
  }
  return `${manWon.toLocaleString()}만`;
}

function shortenSchool(name: string): string {
  return name
    .replace(/초등학교$/, '초')
    .replace(/중학교$/, '중')
    .replace(/고등학교$/, '고')
    .replace(/고교$/, '고');
}

export default function HookHighlights({
  pricePerPyeong,
  latestPriceM10k,
  priceDelta12m,
  monthlyMortgage,
  nearestStation,
  nearestStationDistanceM,
  walkingMin,
  schoolName,
  schoolDistanceM,
  totalUnits,
  builtYear,
}: Props) {
  const cards: Array<{
    key: string;
    icon: React.ReactNode;
    label: string;
    main: string;
    sub: string;
    accent: 'primary' | 'accent' | 'secondary' | 'amber';
    badge?: { text: string; tone: 'up' | 'down' | 'flat' };
  }> = [];

  // 1. 시세 카드
  if (latestPriceM10k) {
    const trendBadge =
      priceDelta12m !== null && priceDelta12m !== undefined
        ? {
            text: `${priceDelta12m > 0 ? '↑' : priceDelta12m < 0 ? '↓' : '→'}${Math.abs(priceDelta12m)}%`,
            tone:
              priceDelta12m > 0 ? ('up' as const) : priceDelta12m < 0 ? ('down' as const) : ('flat' as const),
          }
        : undefined;

    cards.push({
      key: 'price',
      icon: <TrendingUp className="h-4 w-4" />,
      label: '최근 실거래가',
      main: `${formatEok(latestPriceM10k)}원`,
      sub: pricePerPyeong ? `평당 ${formatEok(pricePerPyeong)}원` : '84㎡ 기준',
      accent: 'primary',
      badge: trendBadge,
    });
  }

  // 2. 월 납부액 (대출 시뮬레이션)
  if (monthlyMortgage) {
    cards.push({
      key: 'mortgage',
      icon: <Wallet className="h-4 w-4" />,
      label: '월 대출 상환액',
      main: `${monthlyMortgage.toLocaleString()}만원`,
      sub: '70% 대출 · 30년 · 4.5% 가정',
      accent: 'accent',
    });
  }

  // 3. 교통
  if (nearestStation) {
    cards.push({
      key: 'transit',
      icon: <Train className="h-4 w-4" />,
      label: '가장 가까운 역',
      main: nearestStation.split(' ')[0],
      sub:
        nearestStationDistanceM && walkingMin
          ? `${nearestStationDistanceM}m · 도보 ${walkingMin}분`
          : '실시간 카카오 데이터',
      accent: 'secondary',
    });
  }

  // 4. 학군
  if (schoolName) {
    cards.push({
      key: 'school',
      icon: <GraduationCap className="h-4 w-4" />,
      label: '가장 가까운 학교',
      main: shortenSchool(schoolName),
      sub: schoolDistanceM ? `${schoolDistanceM}m 도보권` : '학군 분석',
      accent: 'amber',
    });
  }

  if (cards.length === 0) return null;

  // 단지 정체성 한 줄 (세대수 + 연식)
  const identity =
    totalUnits && builtYear
      ? `${totalUnits.toLocaleString()}세대 · ${builtYear}년 입주 · ${2026 - builtYear}년차`
      : null;

  const accentMap = {
    primary: 'border-primary/40 bg-primary/10 text-primary',
    accent: 'border-success/40 bg-success-soft text-success',
    secondary: 'border-secondary/40 bg-secondary/10 text-secondary',
    amber: 'border-warning/40 bg-warning-soft text-warning',
  };

  // 카드별 accent를 공용 tint tone으로 매핑 (배경 tint용)
  const toneMap: Record<'primary' | 'accent' | 'secondary' | 'amber', TintTone> = {
    primary: 'primary',
    accent: 'success',
    secondary: 'primary',
    amber: 'warning',
  };

  return (
    <section className="space-y-3">
      {identity ? (
        <div className="flex items-center gap-2 text-xs text-foreground-sub">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
          {identity}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.key}
            className={`relative overflow-hidden rounded-2xl border p-4 shadow-sm ${CARD_TINT[toneMap[card.accent]]}`}
          >
            <div className="flex items-center justify-between">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-lg border ${accentMap[card.accent]}`}
              >
                {card.icon}
              </div>
              {card.badge ? (
                <span
                  className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${
                    card.badge.tone === 'up'
                      ? 'border-success/40 bg-success-soft text-success'
                      : card.badge.tone === 'down'
                      ? 'border-danger/40 bg-danger-soft text-danger'
                      : 'border-border bg-background text-foreground-sub'
                  }`}
                >
                  {card.badge.text}
                </span>
              ) : null}
            </div>
            <div className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-foreground-sub">
              {card.label}
            </div>
            <div className="mt-1 text-lg font-bold leading-tight text-foreground">
              {card.main}
            </div>
            <div className="mt-1 text-[11px] text-foreground-sub">{card.sub}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * 단순 대출 상환 시뮬레이션
 * @param principalManWon 원금 (만원)
 * @param annualRate 연이율 (%, 기본 4.5)
 * @param years 상환 기간 (기본 30년)
 * @returns 월 납부액 (만원)
 */
export function calcMonthlyMortgage(
  principalManWon: number,
  annualRate = 4.5,
  years = 30
): number {
  const r = annualRate / 100 / 12;
  const n = years * 12;
  const monthly = (principalManWon * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  return Math.round(monthly);
}
