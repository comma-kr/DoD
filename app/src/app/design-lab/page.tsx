// 디자인 비교 랩 — 단지 상세분석 페이지의 카드들 [현재] vs [개선안 V1/V2] 비교용.
// URL: /design-lab (메인 메뉴 미노출, 직접 접근만)
//
// 5개 핵심 카드 비교:
//   1. HookHighlights — 시세·교통·학군·금융 4 카드
//   2. InsightCards (단일) — 학군/교통/상권 카드
//   3. LifeScenario — 하루 시나리오 4 카드
//   4. RouteOptions — MY ROUTE 출근 카드
//   5. TradeFlowTabs — 평형 칩 탭 + 차트
//
// 더미 데이터 인라인. 사용자가 원하는 안 골라서 적용 요청 가능.

import HookHighlights from '@/components/report/HookHighlights';
import InsightCards from '@/components/report/InsightCards';
import LifeScenario from '@/components/report/LifeScenario';
import TradeFlowTabs from '@/components/report/TradeFlowTabs';
import { TrendingUp, MapPin, Sunrise, Coffee, Bike, Moon, Train, GraduationCap, ShoppingBag, Hospital, Wallet, Home } from 'lucide-react';

const MOCK_APT = {
  name: '녹번역e편한세상캐슬',
  nearestStation: '녹번역 3호선',
  stationDistanceM: 330,
};

const MOCK_INSIGHTS = {
  schoolDistrictLabel: '은평·연신내권 학군',
  schoolNotes: ['선일여중·선일여고 등 인근 인기 여학교', '은평뉴타운 입주 후 학군 향상'],
  academyCluster: '연신내·불광 학원가',
  commercialArea: '연신내역 + 은평뉴타운 상권',
  majorStores: ['롯데몰 은평점', '이마트 은평점'],
  parks: ['북한산국립공원', '백련산'],
  hospitals: ['은평성모병원', '서울시립서북병원'],
  developments: [{ title: 'GTX-A 연신내역', status: '완료' as const, note: '수서 직결' }],
  hobbySpots: ['북한산 등산·둘레길', '연신내 카페골목'],
};

const MOCK_NEARBY = [
  { id: '1', name: '힐스테이트녹번역아파트', address: '서울 은평구 응암동', distanceKm: 0.4, totalUnits: 879, builtYear: 2022, latitude: 37.59, longitude: 126.93 },
  { id: '2', name: '힐스테이트녹번', address: '서울 은평구 녹번동', distanceKm: 0.8, totalUnits: 952, builtYear: 2018, latitude: 37.60, longitude: 126.93 },
  { id: '3', name: '북한산 푸르지오', address: '서울 은평구 녹번동', distanceKm: 1.2, totalUnits: 1207, builtYear: 2015, latitude: 37.60, longitude: 126.93 },
];

const MOCK_TRADES = [
  { dealDate: '2026-03-30', priceM10k: 148000, areaM2: 84.97, floor: 12 },
  { dealDate: '2026-03-23', priceM10k: 148000, areaM2: 84.94, floor: 11 },
  { dealDate: '2026-02-14', priceM10k: 138000, areaM2: 84.94, floor: 7 },
  { dealDate: '2026-01-28', priceM10k: 135000, areaM2: 84.97, floor: 5 },
  { dealDate: '2025-12-15', priceM10k: 142000, areaM2: 84.99, floor: 18 },
  { dealDate: '2025-11-20', priceM10k: 132000, areaM2: 84.94, floor: 3 },
  { dealDate: '2025-10-10', priceM10k: 145000, areaM2: 84.99, floor: 15 },
  { dealDate: '2025-09-05', priceM10k: 130000, areaM2: 84.97, floor: 8 },
  // 59㎡ 평형도 섞기
  { dealDate: '2026-03-22', priceM10k: 127000, areaM2: 59.94, floor: 11 },
  { dealDate: '2026-02-10', priceM10k: 120000, areaM2: 59.94, floor: 6 },
  { dealDate: '2025-12-01', priceM10k: 118000, areaM2: 59.94, floor: 14 },
];

export default function DesignLabPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 pt-12 pb-24">
      <header className="mb-8">
        <span className="mb-3 inline-block rounded-full bg-warning-soft px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-warning">
          DESIGN LAB · 비공개
        </span>
        <h1 className="text-3xl font-bold tracking-tight">단지 상세분석 카드 디자인 비교</h1>
        <p className="mt-3 text-sm leading-relaxed text-foreground-sub">
          현재 디자인 옆에 개선안 V1/V2/V3을 비교. 마음에 드는 안 골라서 적용 요청.
        </p>
      </header>

      {/* 사용자 채택 현황 */}
      <div className="mb-10 rounded-2xl border-2 border-success/30 bg-success-soft/30 p-5">
        <div className="text-[11px] font-bold uppercase tracking-wider text-success">USER 채택 현황</div>
        <ul className="mt-2 space-y-1 text-sm">
          <li>✅ <strong>MY ROUTE (4번)</strong> — V1 미니 지하철도형 채택</li>
          <li>🔄 <strong>HookHighlights (1번)</strong> — V3 혼합안 (V1 큰 숫자 + V2 우선순위 hero) 신규 추가</li>
          <li>⏳ 2·3·5번 — 미결정</li>
        </ul>
      </div>

      {/* ============================================================
          1. HookHighlights — 첫 인상 4 카드
         ============================================================ */}
      <Section number={1} title="시세·교통·학군·세대 4 카드 (HookHighlights)">
        <Variant label="현재 (V0) — ❌ 문제 있음" note="단일 카드가 작고 정보 빈약 (예: '가장 가까운 역 / 녹번역 / 도보 5분'만). 우선순위 ★도 동일 폭이라 시각 임팩트 약함">
          <HookHighlights
            pricePerPyeong={4434}
            latestPriceM10k={148000}
            priceDelta12m={-1.6}
            monthlyMortgage={524000}
            nearestStation="녹번역 3호선"
            nearestStationDistanceM={330}
            walkingMin={5}
            schoolName="서울은평초등학교"
            schoolDistanceM={420}
            totalUnits={2569}
            builtYear={2021}
            priorities={['transport', 'newbuild', 'community']}
            householdType="newlywed"
          />
        </Variant>

        <Variant label="V1 — Hero 통합형" note="4 카드 → 1개 큰 카드. 핵심 숫자만 강조 (시세·통근·평형) + 보조 정보 mini">
          <div className="rounded-3xl border-2 border-primary/30 bg-gradient-to-br from-primary-soft/40 via-surface to-surface p-7 shadow-sm">
            <div className="flex items-baseline justify-between">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-primary-ink">
                  최근 실거래 (전용 84㎡)
                </div>
                <div className="mt-1.5 flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold tracking-tight">14.8억</span>
                  <span className="text-sm font-semibold text-danger">↓ 1.6%</span>
                </div>
                <div className="mt-1 text-xs text-foreground-sub">평당 4,434만 · 월 524만 (대출 70%)</div>
              </div>
              <div className="text-right">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-foreground-sub">규모</div>
                <div className="mt-1 text-2xl font-bold">2,569세대</div>
                <div className="mt-0.5 text-xs text-foreground-sub">2021년 · 5년차</div>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 border-t border-border pt-5">
              <MiniBox icon={<Train className="h-4 w-4" />} label="가까운 역" value="녹번역" sub="도보 5분 (330m)" />
              <MiniBox icon={<GraduationCap className="h-4 w-4" />} label="가까운 초등" value="서울은평초" sub="420m" />
            </div>
          </div>
        </Variant>

        <Variant label="V2 — 우선순위 강조형" note="사용자 우선순위 1순위 카드를 2배 크기로 + 나머지는 작게. ★ 표시">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="md:col-span-2 rounded-3xl border-2 border-primary bg-primary-soft/30 p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <Train className="h-5 w-5 text-primary" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary">★ 1순위 — 출퇴근</span>
              </div>
              <div className="mt-3 text-3xl font-extrabold tracking-tight">녹번역 도보 5분</div>
              <div className="mt-1 text-sm text-foreground-sub">3호선 · 330m · 광화문 21분 (직결)</div>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <div className="rounded-2xl border border-border bg-surface p-4">
                <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-foreground-sub">
                  <Wallet className="h-3 w-3" /> 시세
                </div>
                <div className="mt-1 text-lg font-bold">14.8억</div>
                <div className="text-[10px] text-danger">↓ 1.6%</div>
              </div>
              <div className="rounded-2xl border border-border bg-surface p-4">
                <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-foreground-sub">
                  <Home className="h-3 w-3" /> 규모
                </div>
                <div className="mt-1 text-lg font-bold">2,569세대</div>
                <div className="text-[10px] text-foreground-sub">2021년 · 5년차</div>
              </div>
            </div>
          </div>
        </Variant>

        <Variant label="V3 ⭐ 혼합안 (V1 큰 숫자 + V2 우선순위 hero)" note="우선순위 1순위 = Hero 카드(2 col, 큰 숫자·sub 라인 풍부). 보조 3개 = 컬러 액센트 + 큰 값. 작은 카드도 정보 풍부, 빈약함 해소">
          <div className="space-y-3">
            {/* HERO — 1순위 (출퇴근) — 2 col 폭, 큰 숫자 + 부가 라인 풍부 */}
            <div className="rounded-3xl border-2 border-primary bg-gradient-to-br from-primary-soft/50 via-primary-soft/20 to-surface p-7 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                  <Train className="h-3 w-3" /> ★ 1순위 — 출퇴근
                </span>
                <span className="text-xs font-semibold text-foreground-sub">녹번역 3호선</span>
              </div>
              <div className="mt-4 flex items-end gap-3">
                <div>
                  <div className="text-5xl font-extrabold tracking-tight leading-none">5<span className="ml-1 text-2xl text-foreground-sub">분</span></div>
                  <div className="mt-1 text-xs text-foreground-sub">단지 → 녹번역 도보 (330m)</div>
                </div>
                <div className="ml-auto text-right">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-foreground-sub">광화문</div>
                  <div className="mt-0.5 text-2xl font-extrabold text-success">21분</div>
                  <div className="text-[10px] text-foreground-sub">직결 · 3호선</div>
                </div>
              </div>
            </div>

            {/* 보조 3 카드 — 균등 grid, 컬러 액센트 + 큰 값 */}
            <div className="grid gap-3 md:grid-cols-3">
              {/* 시세 */}
              <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <Wallet className="h-4 w-4 text-foreground-sub" />
                  <span className="rounded-md bg-danger-soft px-1.5 py-0.5 text-[9px] font-bold text-danger">↓ 1.6%</span>
                </div>
                <div className="mt-3 text-[10px] font-bold uppercase tracking-wider text-foreground-sub">최근 실거래</div>
                <div className="mt-1 text-2xl font-extrabold leading-tight tracking-tight">14.8억</div>
                <div className="mt-0.5 text-[11px] text-foreground-sub">전용 84㎡ · 평당 4,434만</div>
                <div className="mt-2 rounded-lg bg-surface-soft px-2 py-1 text-[10px] text-foreground-sub">월 524만 (대출 70%)</div>
              </div>
              {/* 학군 */}
              <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <GraduationCap className="h-4 w-4 text-foreground-sub" />
                  <span className="rounded-md bg-success-soft px-1.5 py-0.5 text-[9px] font-bold text-success">초 420m</span>
                </div>
                <div className="mt-3 text-[10px] font-bold uppercase tracking-wider text-foreground-sub">가까운 초등</div>
                <div className="mt-1 text-2xl font-extrabold leading-tight tracking-tight">서울은평초</div>
                <div className="mt-0.5 text-[11px] text-foreground-sub">은평·연신내권 학군</div>
                <div className="mt-2 rounded-lg bg-surface-soft px-2 py-1 text-[10px] text-foreground-sub">연신내·불광 학원가</div>
              </div>
              {/* 세대 */}
              <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <Home className="h-4 w-4 text-foreground-sub" />
                  <span className="rounded-md bg-primary-soft px-1.5 py-0.5 text-[9px] font-bold text-primary-ink">대단지</span>
                </div>
                <div className="mt-3 text-[10px] font-bold uppercase tracking-wider text-foreground-sub">규모 · 연식</div>
                <div className="mt-1 text-2xl font-extrabold leading-tight tracking-tight">2,569<span className="ml-0.5 text-base">세대</span></div>
                <div className="mt-0.5 text-[11px] text-foreground-sub">2021년 입주 · 5년차</div>
                <div className="mt-2 rounded-lg bg-surface-soft px-2 py-1 text-[10px] text-foreground-sub">준신축 + 커뮤니티 풍부</div>
              </div>
            </div>
          </div>
        </Variant>
      </Section>

      {/* ============================================================
          2. InsightCards — 단일 카드 디자인 (예: 학군)
         ============================================================ */}
      <Section number={2} title="6개 카드 중 단일 (예: 학군) 디자인">
        <Variant label="현재 (V0)" note="아이콘 + 제목 + 본문 — 통일된 톤">
          <div className="max-w-md">
            <InsightCards
              apartment={{ name: MOCK_APT.name, nearestStation: MOCK_APT.nearestStation, stationDistanceM: MOCK_APT.stationDistanceM }}
              insights={MOCK_INSIGHTS}
              nearby={MOCK_NEARBY}
              priorities={['transport']}
              householdType="newlywed"
            />
          </div>
        </Variant>

        <Variant label="V1 — 큰 헤드 + 빠른 fact" note="첫 줄에 가장 중요한 정보 큰 글씨. 보조 정보는 mini chip">
          <div className="max-w-md rounded-2xl border border-border bg-surface p-6 shadow-sm">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-primary">
              <GraduationCap className="h-4 w-4" />
              학군
            </div>
            <h3 className="mt-3 text-xl font-extrabold leading-tight">은평·연신내권 학군</h3>
            <p className="mt-1.5 text-sm text-foreground-sub">📚 연신내·불광 학원가</p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              <span className="rounded-md bg-surface-soft px-2 py-1 text-[10px] font-semibold text-foreground-sub">선일여중·선일여고 등 인기 여학교</span>
              <span className="rounded-md bg-surface-soft px-2 py-1 text-[10px] font-semibold text-foreground-sub">은평뉴타운 학군 향상</span>
            </div>
          </div>
        </Variant>

        <Variant label="V2 — 컬러 사이드바 + 컴팩트" note="좌측 컬러 바로 카드 종류 시각화. 더 컴팩트, 그리드 6칸 빽빽">
          <div className="max-w-md flex overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
            <div className="w-1.5 shrink-0 bg-success" />
            <div className="flex-1 p-5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-success">학군</span>
                <GraduationCap className="h-4 w-4 text-success" />
              </div>
              <div className="mt-2.5 text-base font-bold leading-snug">은평·연신내권 학군</div>
              <div className="mt-1.5 text-xs leading-relaxed text-foreground-sub">
                연신내·불광 학원가 · 선일여중/고 인기
              </div>
            </div>
          </div>
        </Variant>
      </Section>

      {/* ============================================================
          3. LifeScenario — 하루 시나리오 4 카드
         ============================================================ */}
      <Section number={3} title="라이프 시나리오 4 카드 (아침·점심·주말·밤)">
        <Variant label="현재 (V0)" note="가구별 시나리오 자동 분기, 통일된 톤">
          <LifeScenario
            apartmentName={MOCK_APT.name}
            totalUnits={2569}
            builtYear={2021}
            walkingMin={5}
            stationName="녹번역"
            schoolName="서울은평초등학교"
            commercialClusterCount={2}
            district="은평구"
            parks={['북한산국립공원', '백련산']}
            householdType="newlywed"
            priorities={['transport', 'convenience']}
          />
        </Variant>

        <Variant label="V1 — 타임라인형" note="가로 타임라인. 시간 핀 연결, 카드 사이 점선">
          <section className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
            <h3 className="text-base font-bold">🌅 이 단지 살면 일상이 어떨까</h3>
            <div className="relative mt-6 flex flex-col gap-4 md:flex-row md:gap-2">
              <div className="absolute left-4 top-0 bottom-0 w-px bg-border md:hidden" />
              {[
                { time: '7:30', icon: <Sunrise className="h-4 w-4" />, title: '출근', body: '녹번역 도보 5분, 광화문 21분', tone: 'warning' },
                { time: '점심', icon: <Coffee className="h-4 w-4" />, title: '회사', body: '연신내 상권 이용 가능 (재택 시)', tone: 'primary' },
                { time: '주말', icon: <Bike className="h-4 w-4" />, title: '북한산', body: '둘레길 산책·자전거 코스 도보권', tone: 'success' },
                { time: '22시', icon: <Moon className="h-4 w-4" />, title: '귀가', body: '대단지 조명·CCTV 안정', tone: 'primary' },
              ].map((c, i) => (
                <div key={i} className="flex flex-1 items-start gap-3 md:flex-col md:items-stretch">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-${c.tone}-soft text-${c.tone}`}>
                    {c.icon}
                  </span>
                  <div className="flex-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-foreground-sub">{c.time}</div>
                    <div className="mt-0.5 text-sm font-bold">{c.title}</div>
                    <div className="mt-0.5 text-[11px] leading-relaxed text-foreground-sub">{c.body}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </Variant>

        <Variant label="V2 — 큰 시간 prefix + 사이드 컬러바" note="V0 그리드 변형: 좌측 시간 큰 글씨 + 시간대 컬러로 구분">
          <section className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
            <h3 className="text-base font-bold">🌅 이 단지 살면 일상이 어떨까</h3>
            <div className="mt-5 space-y-2">
              {[
                { time: '07:30', tone: '#F59E0B', title: '출근 준비', body: '녹번역 도보 5분 (광화문 21분 직결). 비 오는 날도 우산 하나면 충분.' },
                { time: '점심', tone: '#E25555', title: '단지 주변에서', body: '연신내 상권 2개 권역에 음식점 분포. 1인가구 점심 동선 짧음.' },
                { time: '주말', tone: '#22C55E', title: '북한산 둘레길', body: '북한산국립공원·백련산이 자전거·산책 코스 안.' },
                { time: '22:00', tone: '#8B5CF6', title: '귀가', body: '2,569세대 준신축 단지라 조명·CCTV 안정.' },
              ].map((c, i) => (
                <div key={i} className="flex gap-4 rounded-2xl border border-border bg-surface-soft p-4">
                  <div className="w-1 shrink-0 rounded-full" style={{ background: c.tone }} />
                  <div className="w-16 shrink-0">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-foreground-sub">{c.time}</div>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-bold">{c.title}</div>
                    <div className="mt-1 text-[11px] leading-relaxed text-foreground-sub">{c.body}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </Variant>
      </Section>

      {/* ============================================================
          4. RouteOptions (MY ROUTE) — 출근지 카드
         ============================================================ */}
      <Section number={4} title="MY ROUTE 출근지 카드">
        <Variant label="현재 (V0)" note="단독 큰 카드 + 평형 칩 + 호선 시각화 (TradeFlowTabs와 일관)">
          <div className="rounded-3xl border-2 border-primary/40 bg-primary-soft p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                <MapPin className="h-3 w-3" /> MY ROUTE
              </span>
              <span className="text-xs font-semibold text-foreground-sub">내 출근지까지</span>
            </div>
            <div className="mt-3 text-lg font-extrabold leading-snug">광화문 방면</div>
            <div className="mt-5 rounded-2xl border border-border bg-surface p-5">
              <div className="flex items-center justify-between">
                <span className="text-lg">🚇</span>
                <span className="text-[11px] font-semibold text-foreground-sub">지하철 최단</span>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-base font-extrabold">
                <span className="report-highlight">21분 (도보 포함)</span>
                <span className="ml-2 text-[11px] font-normal text-foreground-sub">· 직결</span>
              </div>
              <div className="mt-3 flex flex-col gap-1.5">
                {[
                  { lineLabel: '3호선', station: '녹번역', role: '탑승' },
                  { lineLabel: '3호선', station: '광화문역', role: '하차' },
                ].map((s, i) => (
                  <div key={i} className="flex items-center gap-2 text-[13px]">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">{i + 1}</span>
                    <span className="rounded-md bg-[#EF7C1C] px-2 py-0.5 text-[10px] font-bold text-white">{s.lineLabel}</span>
                    <span className="flex-1 font-semibold">{s.station}</span>
                    <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold ${i === 0 ? 'bg-primary-soft text-primary-ink' : 'bg-success-soft text-success'}`}>
                      {s.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Variant>

        <Variant label="V1 ✅ 채택" note="역 사이 굵은 컬러 라인 + 역 동그라미 (실제 노선도 느낌)">
          <div className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
            <div className="flex items-baseline justify-between">
              <h3 className="text-base font-bold">🚇 광화문까지</h3>
              <span className="text-[11px] font-semibold text-foreground-sub">지하철 21분 · 직결</span>
            </div>
            <div className="mt-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full border-[3px] border-[#EF7C1C] bg-white text-[10px] font-bold text-[#EF7C1C]">●</span>
                <div>
                  <div className="text-[10px] font-semibold text-foreground-sub">탑승</div>
                  <div className="text-sm font-bold">녹번역</div>
                </div>
              </div>
              <div className="mx-3 flex-1 border-t-4 border-[#EF7C1C]" />
              <span className="rounded-md bg-[#EF7C1C] px-2 py-0.5 text-[10px] font-bold text-white">3호선</span>
              <div className="mx-3 flex-1 border-t-4 border-[#EF7C1C]" />
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full border-[3px] border-[#EF7C1C] bg-white text-[10px] font-bold text-[#EF7C1C]">●</span>
                <div>
                  <div className="text-[10px] font-semibold text-foreground-sub">하차</div>
                  <div className="text-sm font-bold">광화문역</div>
                </div>
              </div>
            </div>
            <div className="mt-4 text-center text-[11px] text-foreground-sub">단지 → 녹번역 도보 5분 포함</div>
          </div>
        </Variant>

        <Variant label="V2 — 구분 강조형" note="시간/환승 큰 숫자 + 라우트는 작게 secondary">
          <div className="rounded-3xl border border-primary/30 bg-surface p-6 shadow-sm">
            <span className="rounded-full bg-primary px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">MY ROUTE</span>
            <div className="mt-4 flex items-end gap-6">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-foreground-sub">광화문</div>
                <div className="mt-1 text-5xl font-extrabold leading-none tracking-tight">21<span className="ml-1 text-2xl text-foreground-sub">분</span></div>
              </div>
              <div className="border-l border-border pl-6">
                <div className="text-[10px] font-bold uppercase tracking-wider text-foreground-sub">환승</div>
                <div className="mt-1 text-2xl font-extrabold text-success">직결</div>
              </div>
            </div>
            <div className="mt-5 flex items-center gap-2 rounded-xl bg-surface-soft px-3 py-2">
              <span className="rounded bg-[#EF7C1C] px-1.5 py-0.5 text-[10px] font-bold text-white">3호선</span>
              <span className="text-xs text-foreground-sub">녹번역 → 광화문역 (단지 도보 5분 포함)</span>
            </div>
          </div>
        </Variant>
      </Section>

      {/* ============================================================
          5. TradeFlowTabs — 평형 칩 탭 + 차트 + 표
         ============================================================ */}
      <Section number={5} title="실거래 흐름 (평형 칩 + 차트)">
        <Variant label="현재 (V0)" note="평형 칩 + 차트 + 표 통합. 거래 많은 평형 디폴트">
          <TradeFlowTabs trades={MOCK_TRADES} apartmentName={MOCK_APT.name} />
        </Variant>

        <Variant label="V1 — 통계 박스 prefix" note="차트 위에 평균·최고·최저·거래수 4개 박스 추가 — 한눈 요약">
          <section className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
            <header className="flex items-baseline justify-between">
              <div>
                <h3 className="text-lg font-bold">📈 실거래 흐름</h3>
                <p className="mt-1 text-xs text-foreground-sub">전용 84㎡ (공급 33평형) · 8건</p>
              </div>
              <span className="rounded-xl bg-surface-soft px-3 py-1.5 text-xs font-semibold text-danger">12개월 ↓ 1.6%</span>
            </header>
            <div className="mt-4 flex gap-1.5">
              <button className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white">전용 84㎡ · 33평 (8)</button>
              <button className="rounded-full bg-surface-soft px-3 py-1.5 text-xs font-semibold text-foreground-sub">전용 59㎡ · 24평 (3)</button>
            </div>
            <div className="mt-4 grid grid-cols-4 gap-2">
              {[
                { label: '평균', value: '13.9억', color: 'foreground' },
                { label: '최고', value: '14.8억', color: 'danger' },
                { label: '최저', value: '13.0억', color: 'primary' },
                { label: '거래', value: '8건', color: 'foreground-sub' },
              ].map((s, i) => (
                <div key={i} className="rounded-xl bg-surface-soft p-3 text-center">
                  <div className="text-[10px] font-semibold text-foreground-sub">{s.label}</div>
                  <div className={`mt-1 text-base font-extrabold text-${s.color}`}>{s.value}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 h-40 rounded-xl border border-dashed border-border bg-surface-soft/40 flex items-center justify-center text-xs text-foreground-sub">
              [차트 영역 — 현재와 동일한 PriceChart 재사용]
            </div>
          </section>
        </Variant>

        <Variant label="V2 — 평형별 sparkline" note="평형 칩 옆에 미니 추세선 (sparkline). 클릭 전에도 트렌드 한눈에">
          <section className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
            <h3 className="text-lg font-bold">📈 실거래 흐름</h3>
            <div className="mt-4 space-y-2">
              {[
                { area: '전용 84㎡', supply: '33평형', count: 8, delta: -1.6, active: true },
                { area: '전용 59㎡', supply: '24평형', count: 3, delta: 1.2, active: false },
              ].map((b, i) => (
                <button
                  key={i}
                  className={`flex w-full items-center gap-4 rounded-2xl border p-3 text-left transition ${b.active ? 'border-primary bg-primary-soft/40' : 'border-border bg-surface-soft hover:border-primary/30'}`}
                >
                  <div className="flex-1">
                    <div className="text-sm font-bold">{b.area} <span className="text-foreground-sub">· {b.supply}</span></div>
                    <div className="text-[11px] text-foreground-sub">거래 {b.count}건 · 12개월 {b.delta > 0 ? '+' : ''}{b.delta}%</div>
                  </div>
                  {/* mini sparkline */}
                  <svg viewBox="0 0 80 24" className="h-6 w-20" preserveAspectRatio="none">
                    <polyline
                      points={i === 0 ? '0,18 10,16 20,8 30,12 40,4 50,6 60,8 70,2 80,6' : '0,12 20,10 40,6 60,8 80,4'}
                      fill="none"
                      stroke={b.delta < 0 ? '#3D5BA9' : '#E25555'}
                      strokeWidth="1.5"
                    />
                  </svg>
                  <TrendingUp className={`h-4 w-4 ${b.delta < 0 ? 'text-primary rotate-180' : 'text-danger'}`} />
                </button>
              ))}
            </div>
            <div className="mt-4 h-40 rounded-xl border border-dashed border-border bg-surface-soft/40 flex items-center justify-center text-xs text-foreground-sub">
              [활성 평형 차트 영역]
            </div>
          </section>
        </Variant>
      </Section>

      <footer className="mt-16 rounded-2xl border border-border bg-surface-soft p-6 text-center text-sm text-foreground-sub">
        마음에 드는 안 골라서 알려주세요. 예: "1번 V1 + 3번 V2 + 5번 V1"<br />
        해당 컴포넌트로 실제 적용 진행할게요.
      </footer>
    </main>
  );
}

function Section({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <section className="mb-16">
      <h2 className="mb-4 text-xl font-bold">
        <span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm font-extrabold text-white">{number}</span>
        {title}
      </h2>
      <div className="space-y-6">{children}</div>
    </section>
  );
}

function Variant({ label, note, children }: { label: string; note: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-baseline gap-2">
        <span className="rounded-md bg-foreground px-2 py-0.5 text-[10px] font-bold text-background">{label}</span>
        <span className="text-[11px] text-foreground-sub">{note}</span>
      </div>
      {children}
    </div>
  );
}

function MiniBox({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-soft text-foreground-sub">{icon}</span>
      <div>
        <div className="text-[10px] font-semibold text-foreground-sub">{label}</div>
        <div className="text-sm font-bold">{value}</div>
        <div className="text-[10px] text-foreground-sub">{sub}</div>
      </div>
    </div>
  );
}
