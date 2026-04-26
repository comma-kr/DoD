// 프로필 기반 개인화된 mock 리포트 생성 (dev 모드 전용)
// 같은 단지라도 가구 형태와 우선순위에 따라 섹션 순서·강조·어조를 조정한다.
//
// 원칙:
//   - 숫자는 전부 DB/API 값만 사용
//   - 투자 자문 표현 금지
//   - 판단 강요 금지, 가능성 제시

import type { ApartmentWithLatestPrice, TradePoint } from '@/types/apartment';
import type {
  UserProfile,
  HouseholdType,
  Priority,
  CommuteArea,
} from '@/types/profile';
import { HOUSEHOLD_LABELS, COMMUTE_LABELS, PRIORITY_LABELS } from '@/types/profile';
import {
  calcPricePerPyeong,
  formatPricePerPyeong,
  m2ToPyeong,
  typicalPublicPyeong,
  standardPrivateArea,
} from './utils';
import { estimateCommute as sharedEstimateCommute } from './commute-matrix';
import type { CommuteEstimate as SharedCommuteEstimate } from './commute-matrix';

// ========= 단지 특성 파생 =========

interface ApartmentFacts {
  name: string;
  address: string;
  district: string;
  dong: string;
  units: number;
  year: number;
  age: number;
  stationName: string;
  stationDistM: number;
  walkMin: number;
  price10k: number | null;
  priceText: string | null;
  areaM2: number | null;       // 전용면적 (실거래가 기준)
  pyeong: number | null;        // 전용 평수 (= areaM2 / 3.3058)
  pyeongSupply: number | null;  // 공급 평형 (시장 호칭, 예: 84㎡ → 34평)
  pricePerPyeong: number | null; // 공급면적 기준 평당가 (시장 표준)
  scaleLabel: string;
  scalePercentile: string;
  ageLabel: string;
  ageComment: string;
  walkComment: string;
  trades: TradePoint[];
  priceDelta6m: number | null;        // 6개월 상승률 % (대표 평형 기준 — 같은 평형끼리 비교)
  priceDelta12m: number | null;       // 12개월 상승률 % (대표 평형 기준)
  priceMax: number | null;            // 관측 기간 최고가 (대표 평형)
  priceMin: number | null;            // 관측 기간 최저가 (대표 평형)
  // 정합성 메타 — buildTrend 카피에 명시 ("어떤 평형 기준 / 어느 기간"):
  observationMonths: number;          // 관측 기간 개월 수 (가장 오래된 ~ 최신)
  totalTradeCount: number;            // 단지 전체 거래 수 (모든 평형)
  repAreaM2: number | null;           // 대표 평형 (표준 전용 ㎡, 거래 가장 많음)
  repAreaCount: number;               // 대표 평형 거래 수
}

function deriveFacts(apt: ApartmentWithLatestPrice): ApartmentFacts {
  const units = apt.totalUnits ?? 0;
  const year = apt.builtYear ?? 0;
  const age = year > 0 ? 2026 - year : 0;
  const stationDistM = apt.stationDistanceM ?? 0;
  const walkMin = stationDistM > 0 ? Math.max(1, Math.round(stationDistM / 70)) : 0;
  const district = apt.address.match(/서울(?:특별시)?\s+(\S+구)/)?.[1] ?? '';
  const dong = apt.address.match(/(\S+동)/)?.[1] ?? '';

  const trades = apt.trades ?? [];
  const sortedAsc = [...trades].sort(
    (a, b) => new Date(a.dealDate).getTime() - new Date(b.dealDate).getTime()
  );
  const rawAreaM2 = apt.latestAreaM2 ?? sortedAsc[sortedAsc.length - 1]?.areaM2 ?? null;
  // 측정값(60.12 등) → 시장 표준 전용 ㎡(59 등)로 정규화. 시세·흐름·평수 표기 모두 일관됨.
  const areaM2 = rawAreaM2 ? standardPrivateArea(rawAreaM2) : null;
  const pyeong = areaM2 ? m2ToPyeong(areaM2) : null;                     // 표준 전용 평수
  const pyeongSupply = areaM2 ? typicalPublicPyeong(areaM2) : null;     // 공급 평형 (시장 호칭)
  const pricePerPyeong =
    apt.latestPrice10k && rawAreaM2
      ? calcPricePerPyeong(apt.latestPrice10k, rawAreaM2)                // 평당가 계산은 측정값 그대로 (정확)
      : null;

  // ── 평형 정합성 ── 상승률은 반드시 "같은 평형끼리" 비교해야 의미 있음.
  // 이전 버그: 84㎡ 14.8억 vs 1년 전 59㎡ 9.5억 비교해서 +55% 헛소리 가능.
  // 수정: standardPrivateArea로 그룹핑 → 거래 가장 많은 평형(대표 평형) 내에서만 비교.
  const repBucket = new Map<number, TradePoint[]>();
  for (const t of trades) {
    const k = standardPrivateArea(t.areaM2);
    if (!repBucket.has(k)) repBucket.set(k, []);
    repBucket.get(k)!.push(t);
  }
  const sortedBuckets = [...repBucket.entries()].sort((a, b) => b[1].length - a[1].length);
  const repAreaM2 = sortedBuckets[0]?.[0] ?? null;
  const repTrades = sortedBuckets[0]?.[1] ?? [];
  const repAreaCount = repTrades.length;

  const repSortedAsc = [...repTrades].sort(
    (a, b) => new Date(a.dealDate).getTime() - new Date(b.dealDate).getTime()
  );
  const repLatest = repSortedAsc[repSortedAsc.length - 1];
  const repLatestPrice = repLatest?.priceM10k ?? null;

  let priceDelta6m: number | null = null;
  let priceDelta12m: number | null = null;
  if (repLatest && repLatestPrice) {
    const latestTime = new Date(repLatest.dealDate).getTime();
    const sixMonthsAgo = latestTime - 180 * 24 * 60 * 60 * 1000;
    const twelveMonthsAgo = latestTime - 365 * 24 * 60 * 60 * 1000;
    // "그 시점에 가장 가까운 거래" = >= 기준일 첫 거래 (오름차순이라 6/12개월 직후 첫 거래)
    const trade6m = repSortedAsc.find((t) => new Date(t.dealDate).getTime() >= sixMonthsAgo);
    const trade12m = repSortedAsc.find((t) => new Date(t.dealDate).getTime() >= twelveMonthsAgo);
    if (trade6m && trade6m !== repLatest) {
      priceDelta6m = Math.round(((repLatestPrice - trade6m.priceM10k) / trade6m.priceM10k) * 1000) / 10;
    }
    if (trade12m && trade12m !== repLatest) {
      priceDelta12m = Math.round(((repLatestPrice - trade12m.priceM10k) / trade12m.priceM10k) * 1000) / 10;
    }
  }

  // 최고/최저는 대표 평형 기준 (이전엔 단지 전체라 평형 무관 비교 = 무의미)
  const repPrices = repTrades.map((t) => t.priceM10k);
  const priceMax = repPrices.length ? Math.max(...repPrices) : null;
  const priceMin = repPrices.length ? Math.min(...repPrices) : null;

  // 관측 기간 (전체 거래 기준 — 단지 전체 활동성 표현)
  const oldestDate = sortedAsc[0]?.dealDate;
  const newestDate = sortedAsc[sortedAsc.length - 1]?.dealDate;
  let observationMonths = 0;
  if (oldestDate && newestDate) {
    const diffMs = new Date(newestDate).getTime() - new Date(oldestDate).getTime();
    observationMonths = Math.max(1, Math.round(diffMs / (30 * 24 * 60 * 60 * 1000)));
  }
  const totalTradeCount = trades.length;

  const scaleLabel =
    units >= 5000
      ? '초대단지'
      : units >= 2500
      ? '대단지'
      : units >= 1000
      ? '중대형 단지'
      : units > 0
      ? '중형 단지'
      : '';
  const scalePercentile =
    units >= 5000
      ? '서울 전체 아파트 상위 1% 규모'
      : units >= 2500
      ? '서울 기준 대단지 그룹'
      : units >= 1000
      ? '중대형 커뮤니티를 갖춘 규모'
      : '아담한 단지 규모';

  const ageLabel =
    age > 0 && age <= 5
      ? '신축'
      : age <= 10
      ? '준신축'
      : age <= 20
      ? '중고년차'
      : age <= 30
      ? '구축'
      : age > 0
      ? '재건축 연한권'
      : '';
  const ageComment =
    age > 0 && age <= 10
      ? '인테리어 감가가 크지 않고 리모델링 부담이 적은 구간이에요'
      : age <= 20
      ? '설비 일부 체크는 필요하지만 전반적으로 무난한 연식이에요'
      : age <= 30
      ? '리모델링·설비 점검 포인트는 확인이 필요해요'
      : age > 0
      ? '재건축 가능성과 현 상태 관리비를 함께 봐야 할 구간이에요'
      : '';

  const walkComment =
    walkMin > 0 && walkMin <= 5
      ? '초역세권으로 분류되는 거리'
      : walkMin <= 10
      ? '역세권 범위'
      : walkMin <= 15
      ? '역까지 도보가 애매한 거리 — 마을버스/자차 병행 고려'
      : '';

  return {
    name: apt.name,
    address: apt.address,
    district,
    dong,
    units,
    year,
    age,
    stationName: apt.nearestStation ?? '',
    stationDistM,
    walkMin,
    price10k: apt.latestPrice10k ?? null,
    priceText: apt.latestPrice10k ? formatPrice10k(apt.latestPrice10k) : null,
    areaM2,
    pyeong,
    pyeongSupply,
    pricePerPyeong,
    scaleLabel,
    scalePercentile,
    ageLabel,
    ageComment,
    walkComment,
    trades,
    priceDelta6m,
    priceDelta12m,
    priceMax,
    priceMin,
    observationMonths,
    totalTradeCount,
    repAreaM2,
    repAreaCount,
  };
}

function formatPrice10k(price10k: number): string {
  if (price10k >= 10000) {
    const eok = Math.floor(price10k / 10000);
    const rest = price10k % 10000;
    return rest > 0 ? `${eok}억 ${rest.toLocaleString('ko-KR')}만원` : `${eok}억원`;
  }
  return `${price10k.toLocaleString('ko-KR')}만원`;
}

// ========= 지역 플레이버 =========

function getDistrictFlavor(district: string): string {
  const map: Record<string, string> = {
    송파구: '잠실 생활권과 석촌호수, 올림픽공원 등 대형 인프라가 특징인 지역이에요.',
    강남구: '서울 주거 수요의 핵이자 업무지구의 중심으로, 시세 변동 폭이 큰 지역이에요.',
    서초구: '강남권과 연결된 고급 주거지로, 학군·교통·문화 시설이 두루 강한 지역이에요.',
    마포구: '여의도·광화문 출근자와 젊은 세대 수요가 두터운 지역이에요.',
    영등포구: '여의도 금융권 직주근접 + 한강 생활권이 결합된 지역이에요.',
    양천구: '목동 학군과 학원가 밀집도로 유명한 학부모 선호 지역이에요.',
  };
  return map[district] ?? '실거주 관점에서 지역 특성을 먼저 체크해볼 만한 곳이에요.';
}

function getAcademyCluster(district: string): string {
  const map: Record<string, string> = {
    송파구: '잠실 새내 학원가가 대표적. 대치동까지 차로 15분 내외',
    강남구: '대치동 학원가(서울 최대 규모). 반경 1km 내 학원 밀집',
    서초구: '서초·방배 학원가 + 대치동 접근성',
    마포구: '대흥·공덕 일대 학원가, 중심가 대비 분산된 구조',
    영등포구: '여의도 학원가 + 목동 접근성',
    양천구: '목동 학원가(강남 대치에 이은 2대 학원가)',
  };
  return map[district] ?? '해당 지역 학원가 밀집도를 지도 앱에서 확인해보세요';
}

function getDongFlavor(district: string): string {
  const map: Record<string, string> = {
    송파구: '주거 위주로 조용하면서도 잠실·석촌호수 생활권과 가까운 구역이에요.',
    강남구: '상권 밀도가 높고 업무·주거가 섞인 구역이라 유동 인구가 많은 편이에요.',
    서초구: '고급 주거지 특성이 강하고 학군·학원 인프라가 탄탄한 구역이에요.',
    마포구: '오래된 주거지와 재개발 구역이 섞여 있고 상권 접근성이 좋은 편이에요.',
    영등포구: '여의도 직장 수요와 한강 생활권이 결합된 구역이에요.',
    양천구: '학군 수요가 주도하는 조용한 주거 중심 구역이에요.',
  };
  return map[district] ?? '생활 편의 시설은 지도 앱으로 반경별 확인을 권장드려요.';
}

// ========= 출근지별 소요시간 추정 =========

type CommuteEstimate = SharedCommuteEstimate;

// 거칠게 추정: 행정구 + 출근지 조합 (백업 매트릭스, 공유 모듈로 이관 예정)
function estimateCommute(
  district: string,
  commuteArea: CommuteArea | undefined
): CommuteEstimate | null {
  const shared = sharedEstimateCommute(district, commuteArea);
  if (shared) return shared;
  return legacyEstimate(district, commuteArea);
}

function legacyEstimate(
  district: string,
  commuteArea: CommuteArea | undefined
): CommuteEstimate | null {
  if (!commuteArea || commuteArea === 'none' || commuteArea === 'etc') return null;

  // district-commuteArea 매트릭스 (min, max, transfer, verdict)
  const matrix: Record<string, Record<string, CommuteEstimate>> = {
    송파구: {
      gangnam: { minMinutes: 15, maxMinutes: 30, transferCount: 0, verdict: '편리', description: '2호선/8호선 환승 한 번으로 20분대 가능' },
      jamsil: { minMinutes: 5, maxMinutes: 15, transferCount: 0, verdict: '최적', description: '잠실 직결 생활권' },
      yeouido: { minMinutes: 35, maxMinutes: 55, transferCount: 1, verdict: '보통', description: '2호선 환승으로 45분 내외' },
      gwanghwamun: { minMinutes: 30, maxMinutes: 50, transferCount: 1, verdict: '보통', description: '2호선→5호선 환승' },
      pangyo: { minMinutes: 25, maxMinutes: 40, transferCount: 0, verdict: '편리', description: '8호선→신분당선 환승 또는 자차' },
      seongsu: { minMinutes: 20, maxMinutes: 35, transferCount: 0, verdict: '편리', description: '2호선 직결' },
    },
    강남구: {
      gangnam: { minMinutes: 5, maxMinutes: 15, transferCount: 0, verdict: '최적', description: '구 내부 이동' },
      jamsil: { minMinutes: 10, maxMinutes: 20, transferCount: 0, verdict: '편리', description: '2호선 직결' },
      yeouido: { minMinutes: 25, maxMinutes: 40, transferCount: 0, verdict: '편리', description: '9호선 직결' },
      gwanghwamun: { minMinutes: 25, maxMinutes: 45, transferCount: 1, verdict: '보통', description: '3호선→5호선 환승' },
      pangyo: { minMinutes: 20, maxMinutes: 35, transferCount: 0, verdict: '편리', description: '신분당선 직결' },
      seongsu: { minMinutes: 15, maxMinutes: 25, transferCount: 0, verdict: '편리', description: '2호선 직결' },
    },
    서초구: {
      gangnam: { minMinutes: 5, maxMinutes: 20, transferCount: 0, verdict: '최적', description: '3호선/9호선 직결' },
      pangyo: { minMinutes: 20, maxMinutes: 35, transferCount: 0, verdict: '편리', description: '신분당선 직결' },
      yeouido: { minMinutes: 25, maxMinutes: 40, transferCount: 0, verdict: '편리', description: '9호선 한 번으로' },
      gwanghwamun: { minMinutes: 30, maxMinutes: 50, transferCount: 1, verdict: '보통', description: '환승 1회 포함' },
      jamsil: { minMinutes: 20, maxMinutes: 35, transferCount: 1, verdict: '편리', description: '2호선 환승' },
    },
    마포구: {
      yeouido: { minMinutes: 10, maxMinutes: 20, transferCount: 0, verdict: '최적', description: '5호선 직결' },
      gwanghwamun: { minMinutes: 10, maxMinutes: 25, transferCount: 0, verdict: '최적', description: '5호선 직결' },
      gangnam: { minMinutes: 30, maxMinutes: 45, transferCount: 1, verdict: '보통', description: '환승 1회 포함' },
      jamsil: { minMinutes: 35, maxMinutes: 50, transferCount: 1, verdict: '보통', description: '2호선 환승' },
      seongsu: { minMinutes: 20, maxMinutes: 35, transferCount: 0, verdict: '편리', description: '6호선 직결' },
    },
    영등포구: {
      yeouido: { minMinutes: 5, maxMinutes: 15, transferCount: 0, verdict: '최적', description: '도보+5분' },
      gwanghwamun: { minMinutes: 25, maxMinutes: 40, transferCount: 0, verdict: '편리', description: '5호선 직결' },
      gangnam: { minMinutes: 30, maxMinutes: 45, transferCount: 0, verdict: '편리', description: '9호선 직결' },
    },
    양천구: {
      yeouido: { minMinutes: 15, maxMinutes: 30, transferCount: 0, verdict: '편리', description: '5호선 직결' },
      gwanghwamun: { minMinutes: 30, maxMinutes: 45, transferCount: 0, verdict: '편리', description: '5호선 한 번으로' },
      gangnam: { minMinutes: 40, maxMinutes: 60, transferCount: 1, verdict: '보통', description: '환승 1회 + 시간 소요' },
    },
  };

  return matrix[district]?.[commuteArea] ?? null;
}

// ========= 가구 형태별 섹션 재배치 =========

interface SectionOrder {
  order: string[]; // 섹션 ID
  emphasize: string; // 강조 섹션 ID
  profileGreeting: string;
}

function planSections(profile: UserProfile | null): SectionOrder {
  if (!profile) {
    return {
      order: ['intro', 'strengths', 'commute', 'school', 'convenience', 'price', 'trend', 'checkpoints', 'closing'],
      emphasize: 'intro',
      profileGreeting: '',
    };
  }

  const h = profile.householdType;
  const greeting = HOUSEHOLD_LABELS[h];

  switch (h) {
    case 'single':
      return {
        order: ['intro', 'strengths', 'commute', 'convenience', 'price', 'trend', 'school', 'checkpoints', 'closing'],
        emphasize: 'commute',
        profileGreeting: `${greeting}를 위한 관점으로 풀어드릴게요.`,
      };
    case 'couple':
      return {
        order: ['intro', 'strengths', 'commute', 'convenience', 'school', 'price', 'trend', 'checkpoints', 'closing'],
        emphasize: 'convenience',
        profileGreeting: `${greeting}(자녀 계획 없음)의 관점으로 정리했어요.`,
      };
    case 'newlywed':
      return {
        order: ['intro', 'strengths', 'commute', 'school', 'convenience', 'price', 'trend', 'checkpoints', 'closing'],
        emphasize: 'school',
        profileGreeting: `${greeting}의 관점으로 풀어드릴게요. 5~10년 후 자녀 계획도 고려했어요.`,
      };
    case 'family_kids':
    case 'school_parent':
      return {
        order: ['intro', 'strengths', 'school', 'commute', 'convenience', 'price', 'trend', 'checkpoints', 'closing'],
        emphasize: 'school',
        profileGreeting: `${greeting}의 관점으로 풀어드릴게요. 학군과 교육 인프라를 중심에 뒀어요.`,
      };
    case 'retired':
      return {
        order: ['intro', 'strengths', 'convenience', 'price', 'trend', 'commute', 'school', 'checkpoints', 'closing'],
        emphasize: 'convenience',
        profileGreeting: `${greeting}의 관점으로 풀어드릴게요. 생활 편의와 의료 접근성을 강조했어요.`,
      };
    case 'investor':
      return {
        order: ['intro', 'strengths', 'price', 'trend', 'commute', 'convenience', 'school', 'checkpoints', 'closing'],
        emphasize: 'trend',
        profileGreeting: `${greeting} 시선으로 펼쳐드릴게요. (참고용 정보예요)`,
      };
  }
}

// ========= 섹션 빌더 =========

function buildIntro(f: ApartmentFacts, profile: UserProfile | null): string {
  const firstImpression = [
    f.units > 0 ? `**${f.units.toLocaleString()}세대**` : null,
    f.year > 0 ? `**${f.year}년 입주**` : null,
    f.stationName && f.walkMin > 0 ? `**${f.stationName} 도보 ${f.walkMin}분**` : null,
    f.priceText ? `**최근 실거래가 ${f.priceText}**` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const positioning = [f.scaleLabel, f.ageLabel, f.walkComment].filter(Boolean).join(' + ');
  const greeting = profile ? `\n\n> 💡 ${planSections(profile).profileGreeting}\n` : '';

  return `## ✨ 첫인상

${firstImpression}${positioning ? ` — "${positioning}"이라는 키워드로 압축되는 단지예요.` : ''}

**${f.name}은(는) ${f.district ? f.district + ' ' : ''}${f.dong ? f.dong + ' 일대에서 ' : ''}${f.scaleLabel || '한'}의 정체성을 가진 단지**로, 숫자만 봐도 포지션이 명확하게 드러나요.${greeting}`;
}

function buildStrengths(f: ApartmentFacts, profile: UserProfile | null): string {
  const strengths: string[] = [];

  if (f.units >= 1000) {
    strengths.push(
      `- **규모의 힘** — ${f.units.toLocaleString()}세대로 ${f.scalePercentile}. 단지 내 상권, 커뮤니티 시설, 관리비 분담 구조에서 대단지 특유의 이점이 살아있어요.`
    );
  }
  if (f.walkMin > 0 && f.walkMin <= 10 && f.stationName) {
    strengths.push(
      `- **${f.stationName} 역세권** — ${f.stationDistM}m로 도보 ${f.walkMin}분 이내. 일상 통근 시 누적 피로도가 낮은 거리예요.`
    );
  }
  if (f.age > 0 && f.age <= 10) {
    strengths.push(
      `- **${f.ageLabel} 포지션** — ${f.year}년 입주, 현재 ${f.age}년 차. ${f.ageComment}.`
    );
  } else if (f.age >= 30) {
    strengths.push(
      `- **장기 보유 단지** — ${f.year}년 입주, ${f.age}년 차. 재건축·리모델링 논의와 함께 가격 움직임을 지켜볼 수 있는 구간이에요.`
    );
  }

  // 프로필 기반 추가 강점 — 가구별 본질 키워드 한 줄
  if (profile?.householdType === 'family_kids' || profile?.householdType === 'school_parent') {
    if (f.district) {
      strengths.push(
        `- **${f.district} 학군 포지션** — ${getAcademyCluster(f.district)}이라는 관점에서 학령기 자녀를 둔 가족에게 체크해볼 포인트예요.`
      );
    }
  }
  if (profile?.householdType === 'single') {
    if (f.units >= 2000) {
      strengths.push(
        `- **1인 일상이 단지 안에서** — 대단지 상가에 카페·편의점·헬스장이 있어 퇴근 후 동선이 짧고, 야간에도 단지 내 조명·CCTV가 안정적이에요.`
      );
    } else if (f.walkMin > 0 && f.walkMin <= 7) {
      strengths.push(
        `- **1인 통근에 최적** — ${f.stationName} 도보 ${f.walkMin}분이라 출퇴근 피로 누적이 적고, 배달·외식 동선도 역세권 상권으로 자연스럽게 이어져요.`
      );
    }
  }
  if (profile?.householdType === 'couple') {
    strengths.push(
      `- **둘이 정주하기 좋은 구조** — ${f.units.toLocaleString()}세대 규모와 ${f.stationName ?? '인근'} 접근성은 두 사람의 통근·생활 리듬을 분산 없이 맞추기 좋은 포지션이에요.`
    );
  }
  if (profile?.householdType === 'newlywed') {
    strengths.push(
      `- **5~10년 후도 함께** — 지금의 통근 효율과 미래 자녀 학군 후보를 동시에 검토할 수 있는 구간이에요. 평수 확장 가능성도 함께 보세요.`
    );
  }
  if (profile?.householdType === 'retired') {
    strengths.push(
      `- **은퇴 후 정주 안정성** — ${f.units.toLocaleString()}세대 규모는 관리 체계가 탄탄하고, 단지 내 평지·엘리베이터·종합 보안이 고령 거주에 유리한 편이에요.`
    );
  }
  if (profile?.householdType === 'investor') {
    strengths.push(
      `- **거래 활성도 관점** — ${f.units.toLocaleString()}세대 규모는 매물 다양성과 임차 수요 측면에서 거래가 잠잠하지 않을 가능성이 있어요.`
    );
  }

  return `## 💪 눈에 띄는 포인트\n\n${strengths.slice(0, 4).join('\n')}`;
}

function buildCommute(
  f: ApartmentFacts,
  profile: UserProfile | null
): string {
  const estimate =
    profile?.commuteArea && profile.commuteArea !== 'none' && profile.commuteArea !== 'etc'
      ? estimateCommute(f.district, profile.commuteArea)
      : null;

  const heading = '## 🚇 출퇴근은 어떨까';

  if (estimate && profile?.commuteArea) {
    const areaLabel = COMMUTE_LABELS[profile.commuteArea];
    const verdictColor =
      estimate.verdict === '최적'
        ? '🟢'
        : estimate.verdict === '편리'
        ? '🔵'
        : estimate.verdict === '보통'
        ? '🟡'
        : '🟠';
    return `${heading}

**${areaLabel}** 방면 출근자라고 하셨으니 그 기준으로 풀어드릴게요.

${verdictColor} **${estimate.verdict}** — 예상 소요 시간 **${estimate.minMinutes}~${estimate.maxMinutes}분**${estimate.transferCount > 0 ? `, 환승 ${estimate.transferCount}회` : ', 환승 없음'}

${estimate.description}. 가장 가까운 역은 **${f.stationName}** (${f.stationDistM}m, 도보 ${f.walkMin}분)이에요.

> 💡 출근지 맞춤 교통 분석은 실제 시간대(러시아워)에 지도 앱으로 한 번 더 검증해보시면 확실해요.`;
  }

  // 프로필이 없거나 일반 케이스
  const commutePositioning = getCommutePositioning(f.district);
  return `${heading}

가장 가까운 역은 **${f.stationName || '정보 없음'}**${
    f.walkMin > 0 ? `이고, ${f.stationDistM}m로 도보 약 ${f.walkMin}분` : ''
  } 거리예요.${f.walkComment ? ` 이 정도면 ${f.walkComment}에 해당합니다.` : ''}

${commutePositioning}`;
}

function getCommutePositioning(district: string): string {
  const map: Record<string, string> = {
    송파구:
      '송파구 주요 역세권은 잠실역(2·8호선), 강남·삼성역(2호선)으로 이어지는 동선이 핵심이에요. 잠실 환승으로 강남권 접근이 빠르고, 여의도·광화문은 환승 1회로 처리돼요.',
    강남구:
      '강남구는 그 자체가 업무지구라 단지에서 업무지까지 거리가 짧아요. 2·3·7·9호선 + 신분당선이 교차해 출퇴근 동선이 유연한 편이에요.',
    서초구:
      '서초는 강남권과 연결되면서도 9호선·3호선 + 신분당선 조합이 좋아 강남·판교·여의도 방면 이동이 모두 가능해요.',
    마포구:
      '마포는 5·6호선이 맞물려 여의도·광화문 접근이 최고 수준이에요. 강남권은 환승 1회로 30~45분 수준이에요.',
    영등포구:
      '영등포·여의도는 5·9호선 황금 동선. 여의도 직장인에게는 사실상 도보권이고, 광화문·강남도 환승 없이 접근 가능해요.',
    양천구:
      '양천구는 5호선 목동 라인이 핵심. 여의도·광화문 방면은 직결, 강남은 환승 1회로 이동할 수 있어요.',
  };
  return (
    map[district] ??
    '해당 역 기준으로 평소 통근 동선이 어떻게 잡히는지, 환승 횟수와 소요 시간을 지도 앱으로 먼저 시뮬레이션해보시는 걸 추천해요.'
  );
}

function buildSchool(
  f: ApartmentFacts,
  profile: UserProfile | null,
  kidsInfra: import('./kakao-local').KidsInfra | null,
  nearbySchools: import('./kakao-local').NearbySchool[],
  academyClusterFromDb: string | null
): string {
  const isParent =
    profile?.householdType === 'family_kids' ||
    profile?.householdType === 'school_parent' ||
    profile?.householdType === 'newlywed';

  const heading = '## 🏫 아이 키우기엔';

  if (!isParent && profile) {
    // 자녀 없는 케이스는 짧게
    return `${heading}

직접 해당되시진 않지만, 향후 가족 구성 변화 가능성을 염두에 두시면 이 지역 학군은 ${getAcademyCluster(f.district)}이라는 정도만 알아두시면 돼요.`;
  }

  // 카카오 데이터 기반 육아 인프라 한 줄 — "지도앱 확인" 떠넘김 제거.
  let kidsInfraLine = '';
  if (kidsInfra && (kidsInfra.daycareCount > 0 || kidsInfra.pediatricsCount > 0)) {
    const parts: string[] = [];
    if (kidsInfra.daycareCount > 0) {
      const samples = kidsInfra.daycareSamples.slice(0, 2).join(', ');
      parts.push(`반경 800m 내 **어린이집·유치원 ${kidsInfra.daycareCount}곳**${samples ? ` (예: ${samples})` : ''}`);
    }
    if (kidsInfra.pediatricsCount > 0) {
      const samples = kidsInfra.pediatricsSamples.slice(0, 2).join(', ');
      parts.push(`**소아과 ${kidsInfra.pediatricsCount}곳**${samples ? ` (예: ${samples})` : ''}`);
    }
    kidsInfraLine = `- **주변 육아 인프라**: ${parts.join(' / ')}`;
  } else if (kidsInfra) {
    kidsInfraLine = '- **주변 육아 인프라**: 반경 800m 내 등록된 어린이집·소아과 데이터가 적어요. 직접 둘러보시는 걸 권장.';
  }

  // 카카오 SC4 검색 기반 주변 학교 카운트 — "지도앱 확인" 떠넘김 대체.
  // 각 레벨별 가장 가까운 학교 1개 이름까지 함께 표기.
  let schoolCountLine = '';
  if (nearbySchools.length > 0) {
    const elem = nearbySchools.filter((s) => s.type === '초등학교');
    const mid = nearbySchools.filter((s) => s.type === '중학교');
    const high = nearbySchools.filter((s) => s.type === '고등학교');
    const parts: string[] = [];
    if (elem.length > 0) {
      parts.push(`초등학교 ${elem.length}곳 (가장 가까운 곳: ${elem[0].name})`);
    }
    if (mid.length > 0) {
      parts.push(`중학교 ${mid.length}곳 (가장 가까운 곳: ${mid[0].name})`);
    }
    if (high.length > 0) {
      parts.push(`고등학교 ${high.length}곳 (가장 가까운 곳: ${high[0].name})`);
    }
    if (parts.length > 0) {
      schoolCountLine = `- **반경 1.5km 학교 분포**: ${parts.join(' / ')}`;
    }
  }

  const block = `${heading}

${f.district || '해당 지역'}${f.dong ? ' ' + f.dong : ''} 일대의 학군 정보를 모았어요.

- **배정 초등학교**: 학교알리미(schoolinfo.go.kr)에서 단지 주소 기준 배정 확인 (배정만 정확)
${schoolCountLine ? schoolCountLine + '\n' : ''}- **학원가 밀집도**: ${academyClusterFromDb || getAcademyCluster(f.district)}
${
  f.units >= 1500
    ? `- **단지 내 시설**: ${f.units.toLocaleString()}세대 규모면 단지 내 어린이집·유치원이 자체 운영되는 경우가 많아요. 워킹 부모라면 꼭 확인.`
    : ''
}${kidsInfraLine ? '\n' + kidsInfraLine : ''}`;

  if (profile?.householdType === 'school_parent') {
    return `${block}

> 💡 학군을 최우선으로 두셨으니, 이 단지가 학군 측면에서 어느 포지션인지 정확히 보려면 **같은 구 내 학군 선호 단지와 나란히 비교**해보시는 게 가장 빨라요.`;
  }

  return block;
}

function buildConvenience(f: ApartmentFacts, profile: UserProfile | null): string {
  const heading = '## 🏪 생활 편의';
  const base =
    f.units >= 2000
      ? `${f.units.toLocaleString()}세대 규모는 단지 내부만으로도 작은 생활권을 만들어요. 상가, 커뮤니티 시설(피트니스·게스트하우스·카페 등), 지하 주차장 동선이 장점이 되는 단지죠.`
      : `${f.units > 0 ? f.units.toLocaleString() + '세대' : ''} 규모에서는 단지 주변 상권과의 연결이 핵심이에요.`;

  const dongFlavor = `${f.dong ? f.dong + ' 주변은 ' : '단지 주변은 '}${getDongFlavor(f.district)}`;

  if (profile?.householdType === 'single') {
    return `${heading}

${base}

${dongFlavor}

> 💡 1인가구 관점에서는 24시간 편의점·배달 상권·피트니스 접근성이 체감 만족도를 크게 좌우해요. 실제 위치 기반 서비스(배민·쿠팡이츠)로 주변 밀도를 확인해보시는 것도 방법이에요.`;
  }
  if (profile?.householdType === 'retired') {
    return `${heading}

${base}

${dongFlavor}

> 💡 은퇴 후 주거에서는 **병원 접근성**이 특히 중요해요. 단지 반경 1km 내 종합병원·대형 약국·건강검진센터 위치를 지도 앱에서 확인해보세요. 또한 도보 생활권에서 일상이 해결되는지가 만족도의 핵심이에요.`;
  }
  if (profile?.householdType === 'family_kids' || profile?.householdType === 'school_parent') {
    return `${heading}

${base}

${dongFlavor}

> 💡 자녀 동선 관점에서는 **소아과·키즈카페·마트·도서관**까지의 거리를 함께 체크해보시는 게 좋아요.`;
  }

  return `${heading}\n\n${base}\n\n${dongFlavor}`;
}

function buildPrice(f: ApartmentFacts, _profile: UserProfile | null): string {
  const heading = '## 💰 지금 시세는';

  if (!f.priceText) {
    return `${heading}\n\n최근 실거래가 데이터가 아직 수집되지 않았어요. 국토부 실거래가 공개시스템에서 최신 내역을 확인할 수 있어요.`;
  }

  const positionLabel =
    f.price10k && f.price10k >= 300000
      ? '서울 최상급지 가격대'
      : f.price10k && f.price10k >= 200000
      ? '서울 주요 상급지 가격대'
      : f.price10k && f.price10k >= 100000
      ? '서울 중상위권 가격대'
      : '서울 평균 수준 가격대';

  // 평당가는 시장 표준인 공급면적 기준 (호갱노노/네이버부동산/아실 동일).
  // 라벨에 "공급면적 기준" 명시해서 25.7평(전용)·34평(공급) 헷갈리는 모순 제거.
  const pyeongLine = f.pricePerPyeong
    ? `\n\n- **평당가**: 약 **${formatPricePerPyeong(f.pricePerPyeong)}** (공급면적 기준 · 시장 표준)`
    : '';

  // 면적: 시장 표준 전용 ㎡로 표기 (측정값 84.97 → 84). 전용 평수와 공급 평형 같이.
  const sizeLine = f.areaM2
    ? `\n- **기준 면적**: 전용 **${f.areaM2}㎡** (전용 약 ${f.pyeong}평 / 공급 ${f.pyeongSupply}평형)`
    : '';

  // 메인 문장도 표준 호칭 그대로 사용 — 시세·흐름·평수 모두 동일.
  const sizeIntro = f.areaM2
    ? `**전용 ${f.areaM2}㎡** (공급 ${f.pyeongSupply}평형)`
    : '기준 평형';

  return `${heading}

최근 실거래가는 ${sizeIntro} 기준 **${f.priceText}**이에요. ${positionLabel}에 위치해 있어요.
${sizeLine}${pyeongLine}`;
}

function buildTrend(f: ApartmentFacts, _profile: UserProfile | null): string {
  // 흐름 표·차트는 별도 인터랙티브 컴포넌트(TradeFlowTabs)가 담당.
  // 여기서는 짧은 컨텍스트 한 줄(상승률·평형 분포)만 본문에 둠.
  const heading = '## 📈 실거래 흐름';

  if (!f.trades || f.trades.length === 0) {
    return `${heading}\n\n최근 실거래 데이터가 아직 수집되지 않았어요.`;
  }

  const deltaLine: string[] = [];
  if (f.priceDelta12m !== null) {
    const sign = f.priceDelta12m > 0 ? '📈' : f.priceDelta12m < 0 ? '📉' : '➡️';
    deltaLine.push(
      `${sign} **최근 1년** ${f.priceDelta12m > 0 ? '+' : ''}${f.priceDelta12m}%`
    );
  }
  if (f.priceDelta6m !== null) {
    const sign = f.priceDelta6m > 0 ? '📈' : f.priceDelta6m < 0 ? '📉' : '➡️';
    deltaLine.push(
      `${sign} **최근 6개월** ${f.priceDelta6m > 0 ? '+' : ''}${f.priceDelta6m}%`
    );
  }

  const rangeLine =
    f.priceMax && f.priceMin && f.priceMax !== f.priceMin
      ? `관측 기간 ${formatPrice10k(f.priceMin)} ~ ${formatPrice10k(f.priceMax)}`
      : '';

  // 정합성 핵심 — "어떤 평형을 어느 기간으로 비교했는지" 본문에 명시.
  const repTag = f.repAreaM2
    ? `전용 ${f.repAreaM2}㎡(공급 ${typicalPublicPyeong(f.repAreaM2)}평형) ${f.repAreaCount}건 기준`
    : '';
  const periodTag =
    f.observationMonths > 0
      ? `최근 **${f.observationMonths}개월 ${f.totalTradeCount}건** 실거래 흐름이에요`
      : `최근 **${f.totalTradeCount}건** 실거래 흐름이에요`;

  const deltaWithTag = deltaLine.length > 0 ? `\n\n${deltaLine.join(' · ')}` : '';
  const repNote = repTag ? `\n\n📊 **상승률 기준**: ${repTag} (같은 평형끼리 비교해야 의미가 있어요)` : '';
  const rangeWithBreak = rangeLine ? `\n\n${rangeLine}` : '';

  return `${heading}

${f.name}의 단지 전체 ${periodTag}.${deltaWithTag}${rangeWithBreak}${repNote}

> 💡 아래 카드에서 **평수별로** 골라서 볼 수 있어요. 디폴트는 거래 가장 많은 평형.`;
}

function buildCheckpoints(f: ApartmentFacts, profile: UserProfile | null): string {
  const heading = '## ⚠️ 이런 건 체크해보세요';
  const points: string[] = [];

  if (f.units >= 2000) {
    points.push(
      '- **동별 선호도** — 대단지일수록 동 위치에 따라 소음·일조·뷰가 크게 달라요. 관심 매물의 동·층을 미리 확인해보세요.'
    );
    points.push(
      '- **관리비 수준** — 커뮤니티 시설이 많을수록 월 관리비가 높아질 수 있어요. 관리사무소 공지를 확인해보세요.'
    );
  } else {
    points.push(
      '- **주차 여건** — 세대 대비 주차 대수를 확인해보세요. 특히 구축일수록 이중주차 여부가 실거주 만족도에 큰 영향을 줘요.'
    );
  }

  if (f.age >= 20) {
    points.push(
      '- **설비 노후도** — 배관, 샷시, 난방 방식을 실사 시 체크해보세요. 리모델링 여부가 실거주 만족도의 큰 변수예요.'
    );
  } else if (f.age >= 10) {
    points.push(
      '- **인테리어 상태** — 10년 전후 단지는 집집마다 리모델링 여부가 갈려요. 호가 차이의 상당 부분이 여기서 나와요.'
    );
  }

  // 프로필 기반 추가
  if (profile?.householdType === 'family_kids' || profile?.householdType === 'school_parent') {
    points.push(
      '- **통학 안전성** — 단지에서 배정 학교까지의 도보 동선에 횡단보도·신호등·유해시설 여부를 걸어보며 확인'
    );
  }
  if (profile?.householdType === 'single') {
    points.push('- **방범·보안** — 단지 출입 통제 수준과 CCTV 밀도를 체크');
  }
  if (profile?.householdType === 'retired') {
    points.push('- **층간 이동 편의** — 엘리베이터 위치, 경사로 유무, 단지 내 휴식 공간 동선');
  }

  points.push(
    '- **호가-실거래 갭** — 최근 3개월 실거래가 대비 현재 호가의 차이를 체크. 시장 분위기를 읽는 가장 빠른 지표예요.'
  );

  return `${heading}\n\n${points.slice(0, 4).join('\n')}`;
}

function buildClosing(f: ApartmentFacts, profile: UserProfile | null): string {
  const tagline = [
    f.scaleLabel,
    f.ageLabel,
    f.stationName && f.walkMin <= 10 ? '역세권' : '입지 포지션',
  ]
    .filter(Boolean)
    .join(' · ');

  const profileMessage = profile
    ? getClosingByProfile(profile.householdType, f)
    : '옆 단지와 나란히 놓고 보면 같은 가격대 내에서 어떤 차이가 있는지 훨씬 명확하게 드러나요.';

  return `## 🧭 한 줄 정리

**${tagline}의 조합**이라는 관점에서 ${f.name}을(를) 봤어요.

${profileMessage}

> 💡 **아직 칠까말까 싶다면**
> - 🔵 옆 단지도 칠래말래? → **990원**
> - 🟣 내 조건에 맞는 곳 찾기 → **2,990원**`;
}

function getClosingByProfile(h: HouseholdType, f: ApartmentFacts): string {
  const m: Record<HouseholdType, string> = {
    single: `1인가구 관점에서 보면 ${
      f.walkMin <= 7 ? '역까지 거리가 짧고 ' : ''
    }${
      f.units >= 2000 ? '단지 내 편의시설이 살아있어서 ' : ''
    }일상 동선이 짧은 편이에요. 같은 권역의 비슷한 단지와 비교해보시면 이 단지의 상대 위치가 더 명확해져요.`,
    couple: `2인가구 기준으로 보면 ${
      f.units >= 2000 ? '대단지 커뮤니티 시설과 관리 안정성이 ' : '조용한 주거 환경이 '
    }이 단지의 핵심 매력이에요. 비슷한 평형대와 가격대에서 어떤 선택지가 있는지 나란히 보면 결정이 빨라져요.`,
    newlywed: `신혼부부 관점에서는 5~10년 후까지 함께 고려해야 해요. 지금은 편의·교통이 중요해도, 자녀가 생기면 학군·안전이 결정 변수가 돼요. 그 관점에서 비교 단지들과 나란히 보면 장기 적합성이 보여요.`,
    family_kids: `자녀와 함께라면 학군·통학 안전·단지 내 놀이 환경이 핵심이에요. ${
      f.units >= 2000 ? '대단지라 아이들 친구 형성에도 유리한 편이고, ' : ''
    }비슷한 학군 선호 단지와 비교하면 이 단지의 상대적 포지션이 드러나요.`,
    school_parent: `학군이 최우선이시니, 이 단지 단독으로는 한계가 있어요. **같은 구 내 학군 선호 단지들과 나란히** 봐야 배정 학교·통학 거리·학원가 접근성의 차이가 한눈에 들어와요.`,
    retired: `은퇴 후 주거는 **조용함 + 병원 접근성 + 생활 편의**의 삼각형이 중요해요. ${
      f.units >= 2000 ? '대단지라 관리 안정성 측면에서는 장점이 있고, ' : ''
    }비슷한 조건의 단지들과 비교하면 이 단지의 적합도가 더 선명해져요.`,
    investor: `참고 목적이시니, 이 단지의 포지션을 이해하려면 **가격 흐름**과 **같은 가격대 경쟁 단지** 두 측면을 함께 봐야 해요. 단, 판단은 본인의 분석에 맡겨주세요.`,
  };
  return m[h];
}

// ========= 최종 조립 =========

const DISCLAIMER = `---

※ 본 자료는 공공데이터 기반 참고용 정보이며, 투자 판단이 아닙니다. 판단의 책임은 이용자에게 있습니다.`;

// 한 줄 요약 (TL;DR) — 단지 + 가구 형태 조합으로 1인칭 직접 화법 한 줄 생성.
// 본문 위에 별도 박스로 노출됨. "이 단지를 [당신] 입장에서 한 줄로 정리하면" 톤.
export function buildMockTldr(
  apt: ApartmentWithLatestPrice,
  profile: UserProfile | null
): string {
  const f = deriveFacts(apt);
  // 핵심 형용 3종: 규모 + 연식 + 입지
  const scale = f.units >= 3000 ? '대단지' : f.units >= 1000 ? '중대형' : '중형';
  const ageWord =
    f.age > 0 && f.age <= 10 ? '준신축' : f.age <= 20 ? '연식 있는' : f.age > 0 ? '구축' : '';
  const stationWord =
    f.walkMin > 0 && f.walkMin <= 5
      ? '초역세권'
      : f.walkMin > 0 && f.walkMin <= 10
      ? '역세권'
      : '도보권';
  const tagline = [stationWord, scale, ageWord].filter(Boolean).join(' · ');
  const where = `${f.district || '서울'}${f.dong ? ' ' + f.dong : ''}`;

  // 첫 줄: 단지 정체성 한 줄 (팩트만)
  const head = `${tagline} · ${where}`;

  if (!profile) {
    return `${head}. 칠까말까는 한 장 펼쳐보고 결정해보세요.`;
  }

  // 가구별 행동 가이드 한 줄 (메타 발언·추상어 없이 구체적으로)
  const tail: Record<typeof profile.householdType, string> = {
    single: '1인가구는 출퇴근 동선 하나만 깔끔하게 챙기면 충분해요.',
    couple: '둘이 정주하기엔 무난한 포지션이에요.',
    newlywed: '신혼은 지금 출퇴근에 미래 자녀 동선까지 같이 따져보세요.',
    family_kids: '자녀 있는 집은 통학로부터 한 번 걸어보세요.',
    school_parent: '학군 보러 왔으면 배정 학교·학원가부터 체크.',
    retired: '은퇴 후라면 보행·의료 동선이 진짜 중요해요.',
    investor: '데이터로만 가볍게 정리해드릴게요.',
  };

  return `${head}. ${tail[profile.householdType]}`;
}

export interface MockReportExtras {
  // 단지 좌표 기반 카카오 검색 결과. free route에서 prefetch.
  kidsInfra?: import('./kakao-local').KidsInfra | null;
  nearbySchools?: import('./kakao-local').NearbySchool[];
  // region_insights DB에서 추출한 시군구 큐레이션 (있으면 코드 매트릭스보다 우선)
  academyCluster?: string | null;
}

export function buildMockFreeReport(
  apt: ApartmentWithLatestPrice,
  profile: UserProfile | null,
  extras: MockReportExtras = {}
): string {
  const f = deriveFacts(apt);
  const plan = planSections(profile);

  const builders: Record<string, () => string> = {
    intro: () => buildIntro(f, profile),
    strengths: () => buildStrengths(f, profile),
    commute: () => buildCommute(f, profile),
    school: () => buildSchool(f, profile, extras.kidsInfra ?? null, extras.nearbySchools ?? [], extras.academyCluster ?? null),
    convenience: () => buildConvenience(f, profile),
    price: () => buildPrice(f, profile),
    trend: () => buildTrend(f, profile),
    checkpoints: () => buildCheckpoints(f, profile),
    closing: () => buildClosing(f, profile),
  };

  const body = plan.order.map((id) => builders[id]?.() ?? '').filter(Boolean).join('\n\n');
  return `${body}\n\n${DISCLAIMER}`;
}

// ========= 비교 리포트 (990원 상품) =========

export function buildMockCompareReport(
  apartments: ApartmentWithLatestPrice[],
  profile: UserProfile | null = null
): string {
  const fmtPrice = (p?: number) => {
    if (!p) return '정보 없음';
    if (p >= 10000) {
      const eok = Math.floor(p / 10000);
      const rest = p % 10000;
      return rest > 0
        ? `${eok}억 ${rest.toLocaleString('ko-KR')}만원`
        : `${eok}억원`;
    }
    return `${p.toLocaleString('ko-KR')}만원`;
  };

  const walkMin = (m?: number) => (m ? Math.max(1, Math.round(m / 70)) : 0);

  const cards = apartments
    .map((a, i) => {
      const letter = String.fromCharCode(65 + i);
      const age = a.builtYear ? 2026 - a.builtYear : 0;
      const label =
        (a.totalUnits ?? 0) >= 2500
          ? '대단지'
          : (a.totalUnits ?? 0) >= 1000
          ? '중대형'
          : '중형';
      const ageTag =
        age > 0 && age <= 10
          ? '준신축'
          : age <= 20
          ? '중고년차'
          : age > 0
          ? '구축'
          : '';
      return `- **${letter}. ${a.name}** — ${label}${ageTag ? ` · ${ageTag}` : ''} · ${a.nearestStation ?? '?'} 도보 ${walkMin(a.stationDistanceM)}분 · ${fmtPrice(a.latestPrice10k)}`;
    })
    .join('\n');

  const tableHeader = ['항목', ...apartments.map((_, i) => String.fromCharCode(65 + i))].join(' | ');
  const tableSeparator = ['---', ...apartments.map(() => '---')].join(' | ');
  const rowData = (label: string, fn: (a: ApartmentWithLatestPrice) => string) =>
    [`**${label}**`, ...apartments.map(fn)].join(' | ');

  // 단지별 6/12개월 상승률
  const computeDeltas = (a: ApartmentWithLatestPrice) => {
    const sorted = [...(a.trades ?? [])].sort(
      (x, y) => new Date(x.dealDate).getTime() - new Date(y.dealDate).getTime()
    );
    const latest = sorted[sorted.length - 1];
    let delta6: number | null = null;
    let delta12: number | null = null;
    if (latest) {
      const latestTime = new Date(latest.dealDate).getTime();
      const t6 = sorted.find(
        (t) => new Date(t.dealDate).getTime() >= latestTime - 180 * 86400000
      );
      const t12 = sorted.find(
        (t) => new Date(t.dealDate).getTime() >= latestTime - 365 * 86400000
      );
      if (t6 && t6 !== latest) {
        delta6 = Math.round(((latest.priceM10k - t6.priceM10k) / t6.priceM10k) * 1000) / 10;
      }
      if (t12 && t12 !== latest) {
        delta12 = Math.round(((latest.priceM10k - t12.priceM10k) / t12.priceM10k) * 1000) / 10;
      }
    }
    return { delta6, delta12, count: sorted.length };
  };
  const deltasByApt = new Map(apartments.map((a) => [a.id, computeDeltas(a)]));
  const fmtDelta = (d: number | null) =>
    d !== null ? `${d > 0 ? '+' : ''}${d}%` : '-';

  const tableRows = [
    rowData('단지명', (a) => a.name),
    rowData('세대수', (a) => (a.totalUnits ? `${a.totalUnits.toLocaleString()}세대` : '-')),
    rowData('입주년도', (a) => (a.builtYear ? `${a.builtYear}년` : '-')),
    rowData('가장 가까운 역', (a) => a.nearestStation ?? '-'),
    rowData('역 거리', (a) =>
      a.stationDistanceM
        ? `${a.stationDistanceM}m (도보 ${walkMin(a.stationDistanceM)}분)`
        : '-'
    ),
    rowData('최근 실거래가', (a) => fmtPrice(a.latestPrice10k)),
    rowData('평당가', (a) => {
      if (!a.latestPrice10k || !a.latestAreaM2) return '-';
      const ppy = calcPricePerPyeong(a.latestPrice10k, a.latestAreaM2);
      return formatPricePerPyeong(ppy);
    }),
    rowData('6개월 상승률', (a) => fmtDelta(deltasByApt.get(a.id)?.delta6 ?? null)),
    rowData('12개월 상승률', (a) => fmtDelta(deltasByApt.get(a.id)?.delta12 ?? null)),
  ].join('\n');

  const priced = apartments.filter((a) => a.latestPrice10k);
  const highest =
    priced.length > 0
      ? priced.reduce((max, a) =>
          (a.latestPrice10k ?? 0) > (max.latestPrice10k ?? 0) ? a : max
        )
      : null;
  const lowest =
    priced.length > 0
      ? priced.reduce((min, a) =>
          (a.latestPrice10k ?? 0) < (min.latestPrice10k ?? 0) ? a : min
        )
      : null;

  const priceGap =
    highest && lowest && highest !== lowest
      ? `**${highest.name}**과 **${lowest.name}** 사이에 약 ${fmtPrice((highest.latestPrice10k ?? 0) - (lowest.latestPrice10k ?? 0))} 차이가 있어요.`
      : '가격대가 비슷한 선택지들이에요.';

  const personaBlocks = apartments
    .map((a, i) => {
      const letter = String.fromCharCode(65 + i);
      const units = a.totalUnits ?? 0;
      const age = a.builtYear ? 2026 - a.builtYear : 0;
      const walk = walkMin(a.stationDistanceM);

      const traits: string[] = [];
      if (units >= 3000) traits.push('대단지 커뮤니티와 상권을 중시하는 분');
      if (walk > 0 && walk <= 5) traits.push('초역세권 통근 동선을 우선하는 분');
      else if (walk <= 10) traits.push('역세권 범위의 실거주 편의를 원하는 분');
      if (age > 0 && age <= 10) traits.push('신축급 생활 품질을 선호하는 분');
      else if (age >= 20) traits.push('재건축·리모델링 포텐셜을 보는 분');

      const persona = traits.length > 0 ? traits.join(', ') : '단지의 기본기를 보는 분';
      return `- **${letter}. ${a.name}** — ${persona}에게 어울릴 수 있어요.`;
    })
    .join('\n');

  // 시세 흐름 비교 섹션
  const trendBlock = (() => {
    const lines = apartments.map((a) => {
      const d = deltasByApt.get(a.id);
      const d6 = d?.delta6 ?? null;
      const d12 = d?.delta12 ?? null;
      const cnt = d?.count ?? 0;
      if (cnt === 0) {
        return `- **${a.name}** — 관측 거래 없음`;
      }
      const parts: string[] = [];
      if (d6 !== null) parts.push(`6개월 ${fmtDelta(d6)}`);
      if (d12 !== null) parts.push(`12개월 ${fmtDelta(d12)}`);
      const tail = parts.length > 0 ? parts.join(' · ') : '관측 기간 부족';
      return `- **${a.name}** — ${tail} (${cnt}건 거래)`;
    });

    // 가장 많이 오른 단지 / 가장 적게 오른 단지
    const ranked = apartments
      .map((a) => ({ a, d: deltasByApt.get(a.id)?.delta12 ?? null }))
      .filter((x) => x.d !== null) as { a: ApartmentWithLatestPrice; d: number }[];

    let comment = '관측 기간이 짧아서 흐름 비교는 다음 분기에 다시 봐주세요.';
    if (ranked.length >= 2) {
      ranked.sort((x, y) => y.d - x.d);
      const top = ranked[0];
      const bot = ranked[ranked.length - 1];
      const gap = Math.round((top.d - bot.d) * 10) / 10;
      if (Math.abs(gap) < 1) {
        comment = `세 단지 모두 비슷한 흐름이에요. 가격 순위 변화가 거의 없는 시기입니다.`;
      } else {
        comment = `12개월 기준 **${top.a.name}**이 가장 강한 흐름(${fmtDelta(top.d)}), **${bot.a.name}**이 상대적으로 약한 흐름(${fmtDelta(bot.d)})이에요. 두 단지 사이 ${gap}%p 차이는 같은 가격대 안에서도 흐름의 갈림길을 보여줘요.`;
      }
    }

    return `${lines.join('\n')}\n\n${comment}`;
  })();

  // 프로필 greeting
  const profileGreeting = profile
    ? `\n\n${HOUSEHOLD_LABELS[profile.householdType]}의 ${profile.priorities[0] ? PRIORITY_LABELS[profile.priorities[0]] : '균형'} 관점으로 풀어드릴게요.`
    : '';

  // 우선순위 기반 섹션 순서: 1순위가 transport면 교통 비교를 시세 위로, school이면 규모·연식 다음에 학군 힌트를 붙임 등.
  const priorityOrder = profile?.priorities ?? [];
  const top = priorityOrder[0];

  const sectionTransport = `## 🚇 교통 비교

각 단지의 역까지 도보 분을 나란히 놓고 보면 어느 단지가 어떤 업무 권역에 더 유리한지 감이 잡혀요.

${apartments
  .map(
    (a) =>
      `- **${a.name}** · ${a.nearestStation ?? '?'} ${a.stationDistanceM ?? '?'}m (도보 약 ${walkMin(a.stationDistanceM)}분)`
  )
  .join('\n')}

출근지가 고정된 통근자라면, 같은 권역에서도 역거리 1~2분 차이가 누적되면서 월 단위로는 꽤 큰 차이를 만들어요.${
    top === 'transport'
      ? '\n\n프로필상 출퇴근이 1순위라 이 섹션을 가장 먼저 배치했어요.'
      : ''
  }`;

  const sectionScale = `## 🏗️ 규모·연식 비교

세대수가 큰 단지는 커뮤니티 시설과 관리비 분담 구조에서 이점이 있어요. 반대로 세대수가 작은 단지는 조용한 주거 분위기와 빠른 의사결정(재건축·관리 이슈)에서 장점이 있을 수 있어요.

입주년도 차이는 인테리어 상태, 설비 노후도, 리모델링 부담도에 직접 연결돼요. 10년 이상 차이가 나는 단지끼리 비교할 때 특히 중요한 포인트예요.${
    top === 'school'
      ? '\n\n학군 우선이라면 단지 규모도 같이 봐야 해요. 대단지는 보통 단지 내 어린이집·유치원 운영 확률이 높고, 학원가 접근성과 별개로 영유아 동선이 짧아져요.'
      : ''
  }`;

  const sectionPricePosition = `## 💰 시세 포지션

${
  priced.length === apartments.length && apartments.length >= 2
    ? `단지를 나란히 보면 가격 순위가 나와요.\n\n${apartments
        .slice()
        .sort((a, b) => (b.latestPrice10k ?? 0) - (a.latestPrice10k ?? 0))
        .map((a, i) => `${i + 1}위: **${a.name}** · ${fmtPrice(a.latestPrice10k)}`)
        .join('\n')}\n\n${priceGap} 이 차이만큼의 가치가 어디에서 오는지(세대수? 역거리? 연식?)를 짚어보면 선택 기준이 선명해져요.`
    : '일부 단지의 실거래가 데이터가 없어요. 국토부 실거래가 공개시스템에서 최신 데이터를 확인해보세요.'
}`;

  const sectionTrend = `## 📈 시세 흐름 비교

${trendBlock}`;

  // 우선순위 1순위에 따라 핵심 섹션을 시세 포지션보다 위로 끌어올림
  const middleSections =
    top === 'transport'
      ? [sectionTransport, sectionScale, sectionPricePosition, sectionTrend]
      : top === 'price'
      ? [sectionPricePosition, sectionTrend, sectionTransport, sectionScale]
      : top === 'newbuild' || top === 'size' || top === 'community'
      ? [sectionScale, sectionTransport, sectionPricePosition, sectionTrend]
      : [sectionTransport, sectionScale, sectionPricePosition, sectionTrend];

  return `## 🎯 한 장 요약

${cards}

> ${priceGap}${profileGreeting}

## 📊 나란히 비교표

${tableHeader}
${tableSeparator}
${tableRows}

${middleSections.join('\n\n')}

## 🎭 이런 분에게 어울려요

${personaBlocks}

## 🧭 마지막 정리

${apartments.length}개 단지는 각자의 강점이 뚜렷해요. **같은 가격대 안에서의 선택**이라는 관점에서 보면, 본인이 가장 중요하게 여기는 기준(통근 · 규모 · 연식 · 학군 중 무엇인지)이 명확할수록 선택이 쉬워져요.

${DISCLAIMER}`;
}
