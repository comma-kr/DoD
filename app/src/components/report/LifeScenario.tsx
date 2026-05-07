// "이 단지 살면 일상이 어떨까?" — 신혼부부·초보 매수자가 혹할 시나리오 카드
// 가상의 하루 흐름 + 주말 라이프스타일을 단지별 특성으로 자동 생성

import { Sunrise, Coffee, Bike, Moon } from 'lucide-react';
import { CARD_TINT, type TintTone } from '@/lib/card-tint';
import { apartmentAgeYears } from '@/lib/utils';
import type { HouseholdType, Priority } from '@/types/profile';

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
  householdType?: HouseholdType | null;
  priorities?: Priority[] | null;
}

// 가구 형태별 학교/통학로 안내 — "신혼부부라면" 고정 텍스트 대체
function buildSchoolHint(
  household: HouseholdType | null | undefined,
  shortName: string
): { strong: string; body: string } {
  switch (household) {
    case 'family_kids':
    case 'school_parent':
      return {
        strong: '학령기 자녀',
        body: `통학로(${shortName})를 한 번 걸어보세요. 단지 동(棟) 위치에 따라 거리·횡단보도 동선이 달라져요.`,
      };
    case 'newlywed':
      return {
        strong: '신혼부부',
        body: `미래에 자녀가 다닐 가까운 학교(${shortName})까지의 동선도 한 번 걸어보세요. 같은 단지여도 동(棟) 위치에 따라 통학로가 달라져요.`,
      };
    case 'single':
      return {
        strong: '1인가구',
        body: `학군은 직접 해당되지 않지만, 학교 인접지(${shortName})는 정주 여건이 안정적이라 시세 변동이 잔잔하다는 참고 포인트예요.`,
      };
    case 'couple':
      return {
        strong: '2인가구',
        body: `자녀 계획이 없더라도 학교 인근(${shortName})은 정주 여건과 단지 분위기에 영향을 줘요.`,
      };
    case 'retired':
      return {
        strong: '은퇴 후 주거',
        body: `학교 주변은 보행 환경과 치안이 안정적이에요. ${shortName} 인근 산책 동선을 미리 봐두시면 좋아요.`,
      };
    case 'investor':
      return {
        strong: '참고용',
        body: `${shortName} 인접지는 가격 안정성·임차 수요에 영향을 주는 경향이 있어요. 단순 정보 정리용입니다.`,
      };
    default:
      return {
        strong: '학교 인접',
        body: `가까운 학교(${shortName})까지 동선을 미리 한 번 걸어보세요.`,
      };
  }
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
  householdType,
  priorities = [],
}: Props) {
  const age = apartmentAgeYears(builtYear);
  const isLargeScale = (totalUnits ?? 0) >= 1500;
  const stationShort = stationName?.split(' ')[0]?.replace(/역$/, '역') ?? '가까운 역';

  // 가구 형태별 시점·관점 변형
  const isParent =
    householdType === 'family_kids' || householdType === 'school_parent';
  const isSolo = householdType === 'single';
  const isRetired = householdType === 'retired';

  // 우선순위 1·2순위 — 시나리오 톤 분기에 활용 (향후 Claude API 연동 시 자연어 프롬프트로 대체)
  const priList = priorities ?? [];
  const top1 = priList[0];
  const top2 = priList[1];
  const wantsTransport = top1 === 'transport' || top2 === 'transport';
  const wantsConvenience = top1 === 'convenience' || top2 === 'convenience';
  const wantsQuiet = top1 === 'quiet' || top2 === 'quiet';
  const wantsSize = top1 === 'size' || top2 === 'size';
  void wantsTransport;
  void wantsSize;

  const morningTitle = isParent
    ? '아이 등교·출근'
    : isRetired
    ? '아침 산책'
    : '출근 준비';
  const morningBody = isParent
    ? walkingMin && walkingMin <= 10
      ? `아이 통학 동선과 본인 ${stationShort} ${walkingMin}분 출근을 한 번에 챙길 수 있는 거리예요.`
      : `${stationShort} 출근 + 아이 통학을 동시에 잡으려면 차량·도보 동선을 평일 아침에 미리 답사해보세요.`
    : isRetired
    ? `${stationShort} 주변까지 산책 코스로 걸어보기 좋아요. 출퇴근 인파를 피한 시간대가 한적해요.`
    : walkingMin && walkingMin <= 10
    ? `여유 있게 아침 먹고 ${stationShort}까지 도보 ${walkingMin}분. 비 오는 날도 우산 하나면 충분해요.`
    : `${stationShort} 가는 마을버스 또는 자차 이용. 첫차 시간을 알아두면 든든해요.`;

  const morning: Scenario = {
    icon: <Sunrise className="h-4 w-4" />,
    time: '아침 7:30',
    title: morningTitle,
    body: morningBody,
    accent: 'amber',
  };

  // 우선순위 "조용한 환경" 1·2순위는 점심 시나리오를 외식이 아닌 단지 내·산책으로 변형
  const afternoonBody = wantsQuiet && (isRetired || isSolo)
    ? `평일 점심 시간은 학생·직장인 빠진 한적한 시간대예요. 단지 내 공원·인근 산책 코스를 한 바퀴 돌기 좋은 시점.`
    : isSolo
    ? commercialClusterCount >= 1
      ? `1인 점심·카페 활용도 높아요. 단지 인근 상권 ${commercialClusterCount}개 권역에 혼밥 가능한 곳이 모여있어요.`
      : '주변 상권이 분산돼 1인 외식 동선은 다소 분산적. 배달·마켓 의존도가 높을 수 있어요.'
    : isParent
    ? commercialClusterCount >= 2
      ? `아이 학원 픽업·주말 가족 외식 동선이 ${commercialClusterCount}개 상권 권역에 분산돼 있어 선택지가 풍부해요.`
      : '가족 외식·아이 학원 동선 기준에서는 상권이 다소 분산돼 있어 차량 이동이 편할 수 있어요.'
    : commercialClusterCount >= 2
    ? `걸어서 닿는 ${commercialClusterCount}개 상권 군집에 음식점·카페가 충분해요. 재택근무·점심외출에 편안한 환경이에요.`
    : commercialClusterCount === 1
    ? '단지 인근 1개 상권 권역에 식당·카페가 모여있어요. 평일 점심 동선이 짧아요.'
    : '주변 상권은 다소 분산돼 있어요. 차로 5~10분 거리에 더 큰 상권이 있어요.';

  const afternoon: Scenario = {
    icon: <Coffee className="h-4 w-4" />,
    time: '점심·낮시간',
    title: isParent ? '학원·외식 동선' : isSolo ? '나만의 점심 동선' : '단지 주변에서',
    body: afternoonBody,
    accent: 'orange',
  };

  const weekendBody = isParent
    ? parks.length > 0
      ? `${parks.slice(0, 2).join(', ')} 등은 자전거·유아차 가족 코스로 좋아요. 주말 가족 야외활동 거점.`
      : '아이 데리고 주말 갈 만한 공원·하천은 직접 답사 권장. 차량으로 10~20분 내 큰 공원 후보를 미리 정해두면 좋아요.'
    : isRetired
    ? parks.length > 0
      ? `${parks.slice(0, 2).join(', ')} 등이 산책·체조 동선에 있어요. 매일 같은 코스를 도는 데 적합해요.`
      : '은퇴 후 주말 산책 코스는 직접 답사해보세요. 평지 위주의 안전한 보행로가 우선이에요.'
    : parks.length > 0
    ? `${parks.slice(0, 2).join(', ')} 등이 산책·운동 동선 안에 있어요.`
    : '주말 산책 코스는 단지 주변을 직접 답사해보세요. 한강 또는 큰 공원까지의 거리를 확인하시면 좋아요.';

  const weekend: Scenario = {
    icon: <Bike className="h-4 w-4" />,
    time: '주말 오전',
    title: isParent ? '가족 야외활동' : isRetired ? '아침 산책 루트' : '여유로운 산책',
    body: weekendBody,
    accent: 'emerald',
  };

  // 야간: "편의시설" 우선순위는 야간 운동·산책 코스 강조, 그 외는 보안·관리 톤
  const nightBody = wantsConvenience && isSolo
    ? `${apartmentName} 주변 24시 편의점·헬스장·산책 코스 동선이 1인가구 야간 활동의 핵심. 단지 내 ${(totalUnits ?? 0).toLocaleString()}세대 규모면 커뮤니티 시설(헬스장·게스트하우스)도 체크해볼 만해요.`
    : isLargeScale
    ? isParent
      ? `${apartmentName}은 ${(totalUnits ?? 0).toLocaleString()}세대 ${age > 0 && age <= 10 ? '준신축' : age <= 20 ? '연식 있는' : '구축'} 단지라 학원에서 늦게 귀가하는 자녀 동선에서도 단지 내 조명·경비가 안정적인 편이에요.`
      : isSolo
      ? `${(totalUnits ?? 0).toLocaleString()}세대 규모라 야간 귀가 시 단지 내 조명·CCTV가 안정적인 편이에요. 1인가구 보안 측면에서 체크 포인트.`
      : `${apartmentName}은 ${(totalUnits ?? 0).toLocaleString()}세대 ${age > 0 && age <= 10 ? '준신축' : age <= 20 ? '연식 있는' : '구축'} 단지라 야간에도 단지 내 조명·CCTV·경비가 안정적인 편이에요.`
    : `${apartmentName} 같은 ${(totalUnits ?? 0).toLocaleString()}세대 규모는 단지 내 조명·관리 체계를 입주 전 한 번 확인해보시는 게 좋아요.`;

  const night: Scenario = {
    icon: <Moon className="h-4 w-4" />,
    time: '밤 10시',
    title: isSolo ? '안전한 귀가' : '귀가 길',
    body: nightBody,
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
        <span className="text-[11px] text-foreground-sub">· 데이터로 그려본 하루 · 직선거리 기준</span>
      </div>
      <p className="mt-1 text-xs text-foreground-sub">
        실제 입주 전에는 직접 한 번 가보시는 게 좋아요. 참고용 시뮬레이션이에요.
      </p>

      <div className="mt-5 grid auto-rows-fr gap-3 break-keep sm:grid-cols-2 lg:grid-cols-4">
        {scenarios.map((s, i) => (
          <div
            key={i}
            className={`flex flex-col rounded-2xl border border-border bg-surface p-4 ${CARD_TINT[toneMap[s.accent]]}`}
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

      {schoolName ? (() => {
        const shortName = schoolName.replace(/등학교$|학교$/, '');
        const hint = buildSchoolHint(householdType ?? null, shortName);
        return (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-warning/30 bg-warning-soft px-3 py-2 text-[11px] text-foreground-sub">
            <span className="text-warning">💡</span>
            <span>
              <strong className="text-foreground">{hint.strong}</strong> · {hint.body}
            </span>
          </div>
        );
      })() : null}
    </section>
  );
}
