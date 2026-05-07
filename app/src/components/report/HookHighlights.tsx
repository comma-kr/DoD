// 리포트 최상단 훅 하이라이트 — V3 (Hero + 보조 3 카드)
//
// 구조: 1순위 카드는 Hero (그라데이션 + text-5xl), 나머지 3장은 SubCard 그리드.
// 카드 종류: price (대출 footer 포함) / transit / school / household (세대·연식)
// 우선순위: HOUSEHOLD_SPEC + 사용자 priorities[0] → resolveHookOrder

import {
  TrendingUp,
  Train,
  GraduationCap,
  Home,
} from 'lucide-react';
import type { Priority, HouseholdType } from '@/types/profile';
import { resolveHookOrder, type HookKey } from '@/lib/household-priorities';
import { checkStation } from '@/lib/station-display';
import { apartmentAgeYears } from '@/lib/utils';

interface Props {
  pricePerPyeong?: number | null;
  latestPriceM10k?: number | null;
  priceDelta12m?: number | null;
  monthlyMortgage?: number | null;

  nearestStation?: string | null;
  nearestStationDistanceM?: number | null;
  walkingMin?: number | null;

  schoolName?: string | null;
  schoolDistanceM?: number | null;

  totalUnits?: number | null;
  builtYear?: number | null;

  // Hero 우측 destination 블록 — 1순위가 transit일 때만 노출
  destinationLabel?: string | null;
  destinationTimeMin?: number | null;
  destinationHint?: string | null;

  priorities?: Priority[];
  householdType?: HouseholdType | null;
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

type CardTone = 'primary' | 'success' | 'warning' | 'secondary';

interface HeroBlock {
  label: string;
  value: string;
  hint?: string;
  tone?: 'success' | 'warning' | 'danger';
}

interface CardSpec {
  key: HookKey | 'household';
  tone: CardTone;
  icon: React.ReactNode;

  heroBadge: string;          // "출퇴근" / "최근 실거래" / "학군" / "규모·연식"
  heroTopRight?: string;      // 우측 상단 작은 라벨
  heroMain: React.ReactNode;  // 큰 숫자/텍스트
  heroMainSub: string;        // 큰 숫자 아래 한 줄
  heroRight?: HeroBlock;      // 우측 강조 블록 (transit destination 등)

  subTagBg: string;           // tailwind classes for tag chip
  subTag: string;             // ↓ 1.6% / 도보 5분 / etc
  subLabel: string;           // 최근 실거래 / 가까운 역 / etc
  subValue: React.ReactNode;
  subSub: string;
  subFooter?: string;
}

const TONE_HERO_BG: Record<CardTone, string> = {
  primary: 'border-primary bg-gradient-to-br from-primary-soft/50 via-primary-soft/20 to-surface',
  success: 'border-success bg-gradient-to-br from-success-soft/50 via-success-soft/20 to-surface',
  warning: 'border-warning bg-gradient-to-br from-warning-soft/50 via-warning-soft/20 to-surface',
  secondary: 'border-secondary bg-gradient-to-br from-secondary/15 via-secondary/5 to-surface',
};

const TONE_BADGE_BG: Record<CardTone, string> = {
  primary: 'bg-primary text-white',
  success: 'bg-success text-white',
  warning: 'bg-warning text-white',
  secondary: 'bg-secondary text-white',
};

const HERO_RIGHT_TONE: Record<NonNullable<HeroBlock['tone']>, string> = {
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
};

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
  destinationLabel,
  destinationTimeMin,
  destinationHint,
  priorities,
  householdType,
}: Props) {
  const cards: CardSpec[] = [];

  // 1. PRICE — 시세 + 대출 footer
  if (latestPriceM10k) {
    const trendChip =
      priceDelta12m !== null && priceDelta12m !== undefined
        ? {
            text: `${priceDelta12m > 0 ? '↑' : priceDelta12m < 0 ? '↓' : '→'} ${Math.abs(priceDelta12m)}%`,
            isUp: priceDelta12m > 0,
            isDown: priceDelta12m < 0,
          }
        : null;

    cards.push({
      key: 'price',
      tone: 'success',
      icon: <TrendingUp className="h-4 w-4" />,
      heroBadge: '시세',
      heroTopRight: pricePerPyeong ? `평당 ${formatEok(pricePerPyeong)}` : '전용 84㎡',
      heroMain: formatEok(latestPriceM10k),
      heroMainSub: pricePerPyeong
        ? `전용 84㎡ · 평당 ${formatEok(pricePerPyeong)}`
        : '최근 실거래가',
      heroRight: trendChip
        ? {
            label: '전년 대비',
            value: trendChip.text,
            tone: trendChip.isUp ? 'success' : trendChip.isDown ? 'danger' : undefined,
          }
        : undefined,
      subTagBg: trendChip
        ? trendChip.isUp
          ? 'bg-success-soft text-success'
          : trendChip.isDown
          ? 'bg-danger-soft text-danger'
          : 'bg-surface-soft text-foreground-sub'
        : 'bg-surface-soft text-foreground-sub',
      subTag: trendChip?.text ?? '실거래',
      subLabel: '최근 실거래',
      subValue: formatEok(latestPriceM10k),
      subSub: pricePerPyeong ? `전용 84㎡ · 평당 ${formatEok(pricePerPyeong)}` : '전용 84㎡ 기준',
      subFooter: monthlyMortgage
        ? `월 ${monthlyMortgage.toLocaleString()}만 (대출 70%)`
        : undefined,
    });
  }

  // 2. TRANSIT — 가까운 역. station-display 가드:
  //    null = 카드 자체 생략, GTX = (예정) 라벨, 1km+ = '도보 + 버스' 톤다운.
  const station = checkStation(nearestStation, nearestStationDistanceM);
  if (station.show) {
    // 1km+ 거리는 도보 분 표시가 오해를 줘서 사용 안 함 (도보 한계 초과).
    const heroSubText = station.isFar
      ? `단지 → ${station.displayName} (${station.distanceLabel})`
      : walkingMin
      ? `단지 → ${station.displayName} 도보${station.distanceLabel ? ` (${station.distanceLabel})` : ''}`
      : '단지에서 가까운 역';
    const subTagText = station.isFar
      ? '도보+버스'
      : walkingMin
      ? `도보 ${walkingMin}분`
      : '근처';

    cards.push({
      key: 'transit',
      tone: 'primary',
      icon: <Train className="h-4 w-4" />,
      heroBadge: '출퇴근',
      heroTopRight: station.distanceLabel
        ? `${station.displayName} · ${station.distanceLabel}`
        : station.displayName,
      heroMain: !station.isFar && walkingMin ? (
        <>
          {walkingMin}
          <span className="ml-1 text-2xl text-foreground-sub">분</span>
        </>
      ) : (
        station.displayName
      ),
      heroMainSub: heroSubText,
      heroRight:
        destinationLabel && destinationTimeMin
          ? {
              label: destinationLabel,
              value: `${destinationTimeMin}분`,
              hint: destinationHint ?? undefined,
              tone: 'success',
            }
          : undefined,
      subTagBg: station.isFar
        ? 'bg-warning-soft text-warning'
        : 'bg-primary-soft text-primary-ink',
      subTag: subTagText,
      subLabel: '가까운 역',
      subValue: station.displayName,
      subSub: station.distanceLabel ?? '',
      subFooter: destinationLabel && destinationTimeMin
        ? `${destinationLabel} ${destinationTimeMin}분`
        : undefined,
    });
  }

  // 3. SCHOOL — 가까운 학교
  if (schoolName) {
    const schoolWalkMin = schoolDistanceM
      ? Math.max(1, Math.round(schoolDistanceM / 70))
      : null;
    const shortened = shortenSchool(schoolName);
    cards.push({
      key: 'school',
      tone: 'warning',
      icon: <GraduationCap className="h-4 w-4" />,
      heroBadge: '학군',
      heroTopRight: schoolDistanceM ? `${schoolDistanceM}m` : undefined,
      heroMain: shortened,
      heroMainSub: schoolWalkMin
        ? `도보 ${schoolWalkMin}분 · 가장 가까운 학교`
        : '가장 가까운 학교',
      subTagBg: 'bg-success-soft text-success',
      subTag: schoolWalkMin ? `도보 ${schoolWalkMin}분` : '학교',
      subLabel: '가까운 학교',
      subValue: shortened,
      subSub: schoolDistanceM ? `${schoolDistanceM}m` : '',
    });
  }

  // 4. HOUSEHOLD — 세대수·연식
  if (totalUnits || builtYear) {
    const age = apartmentAgeYears(builtYear) || null;
    const ageLabel =
      age === null ? '연식 정보 없음' : age <= 5 ? '준신축' : age <= 10 ? '5~10년차' : age <= 20 ? '10~20년차' : '구축';
    cards.push({
      key: 'household',
      tone: 'secondary',
      icon: <Home className="h-4 w-4" />,
      heroBadge: '규모·연식',
      heroTopRight: ageLabel,
      heroMain: totalUnits ? (
        <>
          {totalUnits.toLocaleString()}
          <span className="ml-1 text-2xl text-foreground-sub">세대</span>
        </>
      ) : (
        '-'
      ),
      heroMainSub: builtYear
        ? `${builtYear}년 입주${age !== null ? ` · ${age}년차` : ''}`
        : '입주년 미상',
      subTagBg: 'bg-secondary/15 text-secondary',
      subTag: ageLabel,
      subLabel: '규모 · 연식',
      subValue: totalUnits ? (
        <>
          {totalUnits.toLocaleString()}
          <span className="ml-0.5 text-base">세대</span>
        </>
      ) : (
        '-'
      ),
      subSub: builtYear ? `${builtYear}년 입주${age !== null ? ` · ${age}년차` : ''}` : '',
    });
  }

  if (cards.length === 0) return null;

  // 우선순위 정렬: 가구 base + 사용자 1순위
  // resolveHookOrder는 'mortgage' 키도 반환할 수 있는데 우리는 'household'로 대체하므로
  // mortgage가 1순위로 잡히면 같은 자리에 'household'를 매핑
  const order: Array<HookKey | 'household'> = resolveHookOrder(householdType, priorities).map((k) =>
    k === 'mortgage' ? 'household' : k
  );
  cards.sort((a, b) => {
    const ai = order.indexOf(a.key);
    const bi = order.indexOf(b.key);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  const hero = cards[0];
  const subs = cards.slice(1);

  return (
    <section className="space-y-3">
      {/* HERO — 1순위 */}
      <div className={`rounded-3xl border-2 ${TONE_HERO_BG[hero.tone]} p-7 shadow-sm`}>
        <div className="flex items-center justify-between gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full ${TONE_BADGE_BG[hero.tone]} px-3 py-1 text-[10px] font-bold uppercase tracking-wider`}
          >
            {hero.icon}
            <span>★ 1순위 — {hero.heroBadge}</span>
          </span>
          {hero.heroTopRight ? (
            <span className="truncate text-xs font-semibold text-foreground-sub">
              {hero.heroTopRight}
            </span>
          ) : null}
        </div>
        <div className="mt-4 flex items-end gap-3">
          <div className="min-w-0">
            <div className="text-5xl font-extrabold tracking-tight leading-none break-keep">
              <span className="report-highlight">{hero.heroMain}</span>
            </div>
            <div className="mt-1 text-xs text-foreground-sub break-keep">{hero.heroMainSub}</div>
          </div>
          {hero.heroRight ? (
            <div className="ml-auto shrink-0 text-right">
              <div className="text-[11px] font-bold uppercase tracking-wider text-foreground-sub">
                {hero.heroRight.label}
              </div>
              <div
                className={`mt-0.5 text-2xl font-extrabold ${
                  hero.heroRight.tone ? HERO_RIGHT_TONE[hero.heroRight.tone] : 'text-foreground'
                }`}
              >
                {hero.heroRight.value}
              </div>
              {hero.heroRight.hint ? (
                <div className="text-[10px] text-foreground-sub">{hero.heroRight.hint}</div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {/* SUB CARDS — 2~4순위 */}
      {subs.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {subs.map((c) => (
            <div
              key={c.key}
              className="flex flex-col rounded-2xl border border-border bg-surface p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="text-foreground-sub">{c.icon}</span>
                <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold ${c.subTagBg}`}>
                  {c.subTag}
                </span>
              </div>
              <div className="mt-3 text-[10px] font-bold uppercase tracking-wider text-foreground-sub">
                {c.subLabel}
              </div>
              <div className="mt-1 text-2xl font-extrabold leading-tight tracking-tight break-keep">
                <span className="report-highlight">{c.subValue}</span>
              </div>
              {c.subSub ? (
                <div className="mt-0.5 text-[11px] text-foreground-sub break-keep">{c.subSub}</div>
              ) : null}
              {c.subFooter ? (
                <div className="mt-2 rounded-lg bg-surface-soft px-2 py-1 text-[10px] text-foreground-sub break-keep">
                  {c.subFooter}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

/**
 * 단순 대출 상환 시뮬레이션
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
