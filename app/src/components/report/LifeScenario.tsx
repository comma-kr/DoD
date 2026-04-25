// "이 단지 살면 일상이 어떨까?" — 신혼부부·초보 매수자가 혹할 시나리오 카드
// 가상의 하루 흐름 + 주말 라이프스타일을 단지별 특성으로 자동 생성

import { Sunrise, Coffee, Bike, Moon } from 'lucide-react';
import { CARD_TINT, type TintTone } from '@/lib/card-tint';

interface Props {
  apartmentName: string;
  totalUnits?: number | null;
  builtYear?: number | null;
  walkingMin?: number | null; // 가까운 역까지
  stationName?: string | null;
  schoolName?: string | null;
  commercialClusterCount?: number;
  district?: string;
  parks?: string[];
}

interface Scenario {
  icon: React.ReactNode;
  time: string;
  title: string;
  body: string;
  accent: 'amber' | 'orange' | 'emerald' | 'violet';
}

export default function LifeScenario({
  apartmentName,
  totalUnits,
  builtYear,
  walkingMin,
  stationName,
  schoolName,
  commercialClusterCount = 0,
  district,
  parks = [],
}: Props) {
  const age = builtYear ? 2026 - builtYear : 0;
  const isLargeScale = (totalUnits ?? 0) >= 1500;
  const stationShort = stationName?.split(' ')[0]?.replace(/역$/, '역') ?? '가까운 역';

  const morning: Scenario = {
    icon: <Sunrise className="h-4 w-4" />,
    time: '아침 7:30',
    title: '출근 준비',
    body:
      walkingMin && walkingMin <= 10
        ? `여유 있게 아침 먹고 ${stationShort}까지 도보 ${walkingMin}분. 비 오는 날도 우산 하나면 충분해요.`
        : `${stationShort} 가는 마을버스 또는 자차 이용. 첫차 시간을 알아두면 든든해요.`,
    accent: 'amber',
  };

  const afternoon: Scenario = {
    icon: <Coffee className="h-4 w-4" />,
    time: '점심·낮시간',
    title: '단지 주변에서',
    body:
      commercialClusterCount >= 2
        ? `걸어서 닿는 ${commercialClusterCount}개 상권 군집에 음식점·카페가 충분해요. 재택근무·점심외출에 편안한 환경이에요.`
        : commercialClusterCount === 1
        ? '단지 인근 1개 상권 권역에 식당·카페가 모여있어요. 평일 점심 동선이 짧아요.'
        : '주변 상권은 다소 분산돼 있어요. 차로 5~10분 거리에 더 큰 상권이 있어요.',
    accent: 'orange',
  };

  const weekend: Scenario = {
    icon: <Bike className="h-4 w-4" />,
    time: '주말 오전',
    title: '여유로운 산책',
    body:
      parks.length > 0
        ? `${parks.slice(0, 2).join(', ')} 등이 산책·운동 동선 안에 있어요. 자전거나 유아차로 다니기 좋은 코스예요.`
        : '주말 산책 코스는 단지 주변을 직접 답사해보세요. 한강 또는 큰 공원까지의 거리를 확인하시면 좋아요.',
    accent: 'emerald',
  };

  const night: Scenario = {
    icon: <Moon className="h-4 w-4" />,
    time: '밤 10시',
    title: '귀가 길',
    body: isLargeScale
      ? `${apartmentName}은 ${(totalUnits ?? 0).toLocaleString()}세대 ${age > 0 && age <= 10 ? '준신축' : age <= 20 ? '연식 있는' : '구축'} 단지라 야간에도 단지 내 조명·CCTV·경비가 안정적인 편이에요.`
      : `${apartmentName} 같은 ${(totalUnits ?? 0).toLocaleString()}세대 규모는 단지 내 조명·관리 체계를 입주 전 한 번 확인해보시는 게 좋아요.`,
    accent: 'violet',
  };

  const scenarios = [morning, afternoon, weekend, night];

  const accentMap = {
    amber: 'border-warning/30 bg-warning-soft text-warning',
    orange: 'border-primary/30 bg-primary-soft text-primary',
    emerald: 'border-success/30 bg-success-soft text-success',
    violet: 'border-primary/30 bg-primary-soft text-primary',
  };

  // scenario accent → 공용 tint tone 매핑 (카드 배경용)
  const toneMap: Record<Scenario['accent'], TintTone> = {
    amber: 'warning',
    orange: 'primary',
    emerald: 'success',
    violet: 'primary',
  };

  return (
    <section className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <h3 className="text-base font-bold">🌅 이 단지 살면 일상이 어떨까</h3>
        <span className="text-[11px] text-foreground-sub">· 데이터로 그려본 하루</span>
      </div>
      <p className="mt-1 text-xs text-foreground-sub">
        실제 입주 전에 직접 답사해보시는 걸 추천드려요. 참고용 시뮬레이션이에요.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {scenarios.map((s, i) => (
          <div
            key={i}
            className={`rounded-2xl border p-4 ${CARD_TINT[toneMap[s.accent]]}`}
          >
            <div className="flex items-center gap-2">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-lg border ${accentMap[s.accent]}`}
              >
                {s.icon}
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-foreground-sub">
                {s.time}
              </div>
            </div>
            <div className="mt-3 text-sm font-bold text-foreground">{s.title}</div>
            <div className="mt-1 text-[11px] leading-relaxed text-foreground-sub">
              {s.body}
            </div>
          </div>
        ))}
      </div>

      {schoolName ? (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-warning/30 bg-warning-soft px-3 py-2 text-[11px] text-foreground-sub">
          <span className="text-warning">💡</span>
          <span>
            <strong className="text-foreground">신혼부부</strong>라면 미래에 자녀가 다닐
            가까운 학교 ({schoolName.replace(/등학교$|학교$/, '')})까지의 동선도 한 번
            걸어보세요. 같은 단지여도 동(棟) 위치에 따라 통학로가 달라져요.
          </span>
        </div>
      ) : null}
      {district ? (
        <div className="mt-2 text-[10px] text-foreground-sub">
          {district} 일반 정보 기반 시뮬레이션 · 부동산 투자 자문이 아닙니다
        </div>
      ) : null}
    </section>
  );
}
