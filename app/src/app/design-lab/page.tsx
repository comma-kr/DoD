// 단지 상세분석 페이지 — 최종 목업
// URL: /design-lab (메인 메뉴 미노출, 직접 접근만)
//
// 사용자 채택안 적용:
//   1. HookHighlights → V3 (Hero + 보조 3 카드)
//   2. InsightCards 6 카드 → V3 형태 (큰 숫자 + 컬러 액센트, 1순위 ★ + ring)
//   3. LifeScenario → V0 유지
//   4. RouteOptions (MY ROUTE) → V1 미니 지하철도형
//   5. TradeFlowTabs → V0 유지
//
// 더미 데이터로 실제 리포트 페이지 흐름 재현.

import LifeScenario from '@/components/report/LifeScenario';
import TradeFlowTabs from '@/components/report/TradeFlowTabs';
import {
  Train,
  GraduationCap,
  ShoppingBag,
  Hospital,
  Hammer,
  Building2,
  Wallet,
  Home,
} from 'lucide-react';

const MOCK_TRADES = [
  { dealDate: '2026-03-30', priceM10k: 148000, areaM2: 84.97, floor: 12 },
  { dealDate: '2026-03-23', priceM10k: 148000, areaM2: 84.94, floor: 11 },
  { dealDate: '2026-02-14', priceM10k: 138000, areaM2: 84.94, floor: 7 },
  { dealDate: '2026-01-28', priceM10k: 135000, areaM2: 84.97, floor: 5 },
  { dealDate: '2025-12-15', priceM10k: 142000, areaM2: 84.99, floor: 18 },
  { dealDate: '2025-11-20', priceM10k: 132000, areaM2: 84.94, floor: 3 },
  { dealDate: '2025-10-10', priceM10k: 145000, areaM2: 84.99, floor: 15 },
  { dealDate: '2025-09-05', priceM10k: 130000, areaM2: 84.97, floor: 8 },
  { dealDate: '2026-03-22', priceM10k: 127000, areaM2: 59.94, floor: 11 },
  { dealDate: '2026-02-10', priceM10k: 120000, areaM2: 59.94, floor: 6 },
  { dealDate: '2025-12-01', priceM10k: 118000, areaM2: 59.94, floor: 14 },
];

export default function DesignLabPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 pt-12 pb-24">
      <header className="mb-10">
        <span className="mb-3 inline-block rounded-full bg-warning-soft px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-warning">
          DESIGN LAB · 최종 목업
        </span>
        <h1 className="text-3xl font-bold tracking-tight">단지 상세분석 — 적용될 모습</h1>
        <p className="mt-3 text-sm leading-relaxed text-foreground-sub">
          사용자 채택안 반영. 실제 리포트 페이지 흐름대로 위에서 아래로 스크롤하며 검토.
        </p>
        <ul className="mt-3 space-y-1 text-xs text-foreground-sub">
          <li>① HookHighlights — V3 (Hero + 보조 3) ✅</li>
          <li>② InsightCards 6 카드 — V3 형태 (큰 숫자 + 컬러 액센트) ✅</li>
          <li>③ LifeScenario — 현재 유지</li>
          <li>④ RouteOptions (MY ROUTE) — V1 미니 지하철도형 ✅</li>
          <li>⑤ TradeFlowTabs — 현재 유지</li>
        </ul>
      </header>

      {/* ============================================================
          ① HookHighlights — V3 채택안
         ============================================================ */}
      <SectionTitle>① 첫인상 — 출퇴근·시세·학군·세대</SectionTitle>
      <div className="mb-12 space-y-3">
        {/* HERO — 1순위 (출퇴근) */}
        <div className="rounded-3xl border-2 border-primary bg-gradient-to-br from-primary-soft/50 via-primary-soft/20 to-surface p-7 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
              <Train className="h-3 w-3" /> ★ 1순위 — 출퇴근
            </span>
            <span className="text-xs font-semibold text-foreground-sub">녹번역 3호선</span>
          </div>
          <div className="mt-4 flex items-end gap-3">
            <div>
              <div className="text-5xl font-extrabold tracking-tight leading-none">
                5<span className="ml-1 text-2xl text-foreground-sub">분</span>
              </div>
              <div className="mt-1 text-xs text-foreground-sub">단지 → 녹번역 도보 (330m)</div>
            </div>
            <div className="ml-auto text-right">
              <div className="text-[11px] font-bold uppercase tracking-wider text-foreground-sub">
                광화문
              </div>
              <div className="mt-0.5 text-2xl font-extrabold text-success">21분</div>
              <div className="text-[10px] text-foreground-sub">직결 · 3호선</div>
            </div>
          </div>
        </div>

        {/* 보조 3 카드 */}
        <div className="grid gap-3 md:grid-cols-3">
          <SubCard
            icon={<Wallet className="h-4 w-4 text-foreground-sub" />}
            tagBg="bg-danger-soft text-danger"
            tag="↓ 1.6%"
            label="최근 실거래"
            value="14.8억"
            sub="전용 84㎡ · 평당 4,434만"
            footer="월 524만 (대출 70%)"
          />
          <SubCard
            icon={<GraduationCap className="h-4 w-4 text-foreground-sub" />}
            tagBg="bg-success-soft text-success"
            tag="초 420m"
            label="가까운 초등"
            value="서울은평초"
            sub="은평·연신내권 학군"
            footer="연신내·불광 학원가"
          />
          <SubCard
            icon={<Home className="h-4 w-4 text-foreground-sub" />}
            tagBg="bg-primary-soft text-primary-ink"
            tag="대단지"
            label="규모 · 연식"
            value={
              <>
                2,569<span className="ml-0.5 text-base">세대</span>
              </>
            }
            sub="2021년 입주 · 5년차"
            footer="준신축 + 커뮤니티 풍부"
          />
        </div>
      </div>

      {/* ============================================================
          ② InsightCards 6 카드 — V3 형태 적용
         ============================================================ */}
      <SectionTitle>② 단지 인사이트 6선</SectionTitle>
      <div className="mb-12 grid gap-3 md:grid-cols-3">
        {/* 1순위 — 교통 (★ + ring 강조) */}
        <InsightV3
          starred
          tone="primary"
          icon={<Train className="h-4 w-4" />}
          label="교통"
          headline="녹번역 도보 5분"
          sub="3호선 · 330m"
          chips={['광화문 21분 직결', '강남 47분']}
        />
        <InsightV3
          tone="success"
          icon={<GraduationCap className="h-4 w-4" />}
          label="학군"
          headline="은평·연신내권"
          sub="서울은평초 도보 5분"
          chips={['연신내 학원가', '선일여중·여고 인기']}
        />
        <InsightV3
          tone="secondary"
          icon={<ShoppingBag className="h-4 w-4" />}
          label="상권·생활권"
          headline="연신내역 + 은평뉴타운"
          sub="2개 상권 권역"
          chips={['롯데몰 은평', '이마트 은평']}
        />
        <InsightV3
          tone="danger"
          icon={<Hospital className="h-4 w-4" />}
          label="인프라"
          headline="은평성모병원"
          sub="병원 · 공원 도보권"
          chips={['북한산국립공원', '백련산']}
        />
        <InsightV3
          tone="warning"
          icon={<Hammer className="h-4 w-4" />}
          label="개발 호재"
          headline="GTX-A 연신내역"
          sub="완료 · 수서 직결"
          chips={['수색·증산 뉴타운 진행중']}
        />
        <InsightV3
          tone="primary"
          icon={<Building2 className="h-4 w-4" />}
          label="주변 대단지"
          headline="3개 대단지 도보권"
          sub="반경 1.5km"
          chips={['힐스테이트녹번역 0.4km', '북한산푸르지오 1.2km']}
        />
      </div>

      {/* ============================================================
          ③ LifeScenario — 현재 유지
         ============================================================ */}
      <SectionTitle>③ 이 단지 살면 일상이 어떨까</SectionTitle>
      <div className="mb-12">
        <LifeScenario
          apartmentName="녹번역e편한세상캐슬"
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
      </div>

      {/* ============================================================
          ④ RouteOptions (MY ROUTE) — V1 미니 지하철도형
         ============================================================ */}
      <SectionTitle>④ MY ROUTE — 내 출근지까지</SectionTitle>
      <div className="mb-12 rounded-3xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex items-baseline justify-between">
          <h3 className="text-base font-bold">🚇 광화문까지</h3>
          <span className="text-[11px] font-semibold text-foreground-sub">지하철 21분 · 직결</span>
        </div>
        <div className="mt-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full border-[3px] border-[#EF7C1C] bg-white text-[10px] font-bold text-[#EF7C1C]">
              ●
            </span>
            <div>
              <div className="text-[10px] font-semibold text-foreground-sub">탑승</div>
              <div className="text-sm font-bold">녹번역</div>
            </div>
          </div>
          <div className="mx-3 flex-1 border-t-4 border-[#EF7C1C]" />
          <span className="rounded-md bg-[#EF7C1C] px-2 py-0.5 text-[10px] font-bold text-white">
            3호선
          </span>
          <div className="mx-3 flex-1 border-t-4 border-[#EF7C1C]" />
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full border-[3px] border-[#EF7C1C] bg-white text-[10px] font-bold text-[#EF7C1C]">
              ●
            </span>
            <div>
              <div className="text-[10px] font-semibold text-foreground-sub">하차</div>
              <div className="text-sm font-bold">광화문역</div>
            </div>
          </div>
        </div>
        <div className="mt-4 text-center text-[11px] text-foreground-sub">
          단지 → 녹번역 도보 5분 포함
        </div>
      </div>

      {/* ============================================================
          ⑤ TradeFlowTabs — 현재 유지
         ============================================================ */}
      <SectionTitle>⑤ 실거래 흐름</SectionTitle>
      <div className="mb-12">
        <TradeFlowTabs trades={MOCK_TRADES} apartmentName="녹번역e편한세상캐슬" />
      </div>

      <footer className="mt-16 rounded-2xl border border-border bg-surface-soft p-6 text-center text-sm text-foreground-sub">
        이대로 적용할까요? 아니면 추가 수정 사항 있으면 알려주세요.
      </footer>
    </main>
  );
}

// ============================================================
// 컴포넌트
// ============================================================

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
      {children}
    </h2>
  );
}

function SubCard({
  icon,
  tag,
  tagBg,
  label,
  value,
  sub,
  footer,
}: {
  icon: React.ReactNode;
  tag: string;
  tagBg: string;
  label: string;
  value: React.ReactNode;
  sub: string;
  footer: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center justify-between">
        {icon}
        <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold ${tagBg}`}>{tag}</span>
      </div>
      <div className="mt-3 text-[10px] font-bold uppercase tracking-wider text-foreground-sub">
        {label}
      </div>
      <div className="mt-1 text-2xl font-extrabold leading-tight tracking-tight">{value}</div>
      <div className="mt-0.5 text-[11px] text-foreground-sub">{sub}</div>
      <div className="mt-2 rounded-lg bg-surface-soft px-2 py-1 text-[10px] text-foreground-sub">
        {footer}
      </div>
    </div>
  );
}

const TONE: Record<
  'primary' | 'success' | 'secondary' | 'danger' | 'warning',
  { iconBg: string; tagBg: string; ring: string }
> = {
  primary: {
    iconBg: 'bg-primary/10 text-primary',
    tagBg: 'bg-primary-soft text-primary-ink',
    ring: 'ring-primary',
  },
  success: {
    iconBg: 'bg-success-soft text-success',
    tagBg: 'bg-success-soft text-success',
    ring: 'ring-success',
  },
  secondary: {
    iconBg: 'bg-secondary/15 text-secondary',
    tagBg: 'bg-secondary/15 text-secondary',
    ring: 'ring-secondary',
  },
  danger: {
    iconBg: 'bg-danger-soft text-danger',
    tagBg: 'bg-danger-soft text-danger',
    ring: 'ring-danger',
  },
  warning: {
    iconBg: 'bg-warning-soft text-warning',
    tagBg: 'bg-warning-soft text-warning',
    ring: 'ring-warning',
  },
};

function InsightV3({
  tone,
  icon,
  label,
  headline,
  sub,
  chips,
  starred,
}: {
  tone: keyof typeof TONE;
  icon: React.ReactNode;
  label: string;
  headline: string;
  sub: string;
  chips: string[];
  starred?: boolean;
}) {
  const t = TONE[tone];
  return (
    <div
      className={`rounded-2xl border border-border bg-surface p-5 shadow-sm ${
        starred ? `ring-2 ${t.ring}/30` : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${t.iconBg}`}>
          {icon}
        </span>
        {starred ? (
          <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold ${t.tagBg}`}>★ 1순위</span>
        ) : (
          <span className="text-[10px] font-bold uppercase tracking-wider text-foreground-sub">
            {label}
          </span>
        )}
      </div>
      {starred ? (
        <div className="mt-3 text-[10px] font-bold uppercase tracking-wider text-foreground-sub">
          {label}
        </div>
      ) : null}
      <div className={`${starred ? 'mt-1' : 'mt-3'} text-base font-extrabold leading-tight tracking-tight`}>
        {headline}
      </div>
      <div className="mt-1 text-[11px] text-foreground-sub">{sub}</div>
      {chips.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1">
          {chips.map((c, i) => (
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
}
