'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Building2,
  BarChart3,
  HelpCircle,
  ChevronDown,
  Sparkles,
  TrendingUp,
  Train,
  GraduationCap,
  Home,
} from 'lucide-react';

type CardKey = 'free' | 'compare' | 'tbd';

interface CardSpec {
  key: CardKey;
  icon: React.ReactNode;
  title: string;
  body: string;
  badge: string;
  badgeColor: 'primary' | 'accent' | 'muted';
  placeholder?: boolean;
}

const CARDS: CardSpec[] = [
  {
    key: 'free',
    icon: <Building2 className="h-5 w-5" />,
    title: '혼자 살래 둘이 살래?',
    body: '1인·딩크·신혼·아이 있는 집까지, 같은 단지도 내 시선 따라 다르게 펼쳐드려요.',
    badge: '무료',
    badgeColor: 'accent',
  },
  {
    key: 'compare',
    icon: <BarChart3 className="h-5 w-5" />,
    title: '옆 단지도 칠래말래?',
    body: '단지 2개를 데이터로 나란히, 뭐가 다른지 한눈에 정리.',
    badge: '990원',
    badgeColor: 'primary',
  },
  {
    key: 'tbd',
    icon: <HelpCircle className="h-5 w-5" />,
    title: '🚧 다음은 뭘 까볼까?',
    body: '갈아타기? 학군 심층? 시세 알림? 어떤 걸 풀어드릴지 고민 중이에요. 곧 픽스해서 알려드림.',
    badge: 'TBD',
    badgeColor: 'muted',
    placeholder: true,
  },
];

export default function WhyChillaeMallaeSection() {
  const [expanded, setExpanded] = useState<CardKey | null>(null);

  return (
    <section className="mx-auto max-w-5xl px-6 pt-20 pb-24 sm:pt-24">
      <div className="mb-10 text-center">
        <span className="text-xs font-semibold uppercase tracking-wider text-primary">
          WHY 칠래말래?
        </span>
        <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
          세 가지 방식으로, 가볍게.
        </h2>
        <p className="mt-2 text-sm text-foreground-sub">
          카드 누르면 어떻게 풀리는지 미리 까볼 수 있어요
        </p>
      </div>

      <div className="grid auto-rows-fr gap-5 break-keep sm:grid-cols-3">
        {CARDS.map((card) => (
          <FeatureCard
            key={card.key}
            spec={card}
            active={expanded === card.key}
            onToggle={() =>
              setExpanded((prev) => (prev === card.key ? null : card.key))
            }
          />
        ))}
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key={expanded}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="mt-6">
              {expanded === 'free' && <FreePreview />}
              {expanded === 'compare' && <ComparePreview />}
              {expanded === 'tbd' && <TbdPreview />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="mt-10 text-center text-xs text-foreground-sub">
        본 서비스는 공공데이터(국토부, 학교알리미 등)를 기반으로 한 참고용
        정보이며, 판단의 책임은 이용자에게 있습니다.
      </p>
    </section>
  );
}

function FeatureCard({
  spec,
  active,
  onToggle,
}: {
  spec: CardSpec;
  active: boolean;
  onToggle: () => void;
}) {
  const { icon, title, body, badge, badgeColor, placeholder } = spec;

  const badgeClass = {
    primary: 'bg-primary-soft text-primary',
    accent: 'bg-success-soft text-success',
    muted: 'bg-foreground/10 text-foreground-sub',
  }[badgeColor];

  const iconBgClass = {
    primary: 'bg-primary-soft text-primary',
    accent: 'bg-success-soft text-success',
    muted: 'bg-foreground/5 text-foreground-sub',
  }[badgeColor];

  const baseClass = placeholder
    ? 'rounded-2xl border-2 border-dashed border-border bg-surface-soft opacity-80'
    : 'rounded-2xl border bg-surface shadow-sm transition hover:-translate-y-0.5 hover:shadow-md';

  const activeRing = active && !placeholder
    ? 'border-primary ring-2 ring-primary-soft'
    : 'border-border';

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={active}
      className={`group flex h-full flex-col p-6 text-left ${baseClass} ${!placeholder ? activeRing : ''}`}
    >
      <div className="flex items-center justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBgClass}`}>
          {icon}
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClass}`}>
          {badge}
        </span>
      </div>
      <h3 className="mt-5 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-foreground-sub">{body}</p>
      <div className="mt-4 flex items-center gap-1 text-xs font-medium text-primary">
        {active ? '접기' : '미리보기'}
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform ${active ? 'rotate-180' : ''}`}
        />
      </div>
    </button>
  );
}

// ──────────────────────────────────────────────────────────
// 미리보기 — 실제 /report/[id] 페이지 컴포넌트(ProfileBadge,
// HookHighlights, 마크다운 섹션 헤더, LifeScenario)의 시각 패턴을
// 함축. 실 데이터/auth 의존 없이 정적 mock으로 구성.
// 실제와 같은 토큰(primary, success, primary-soft, border-l-4 등) 사용.
// ──────────────────────────────────────────────────────────

function PreviewFrame({
  badge,
  badgeColor,
  title,
  subTitle,
  children,
  hint,
}: {
  badge: string;
  badgeColor: 'success' | 'warning' | 'muted';
  title: string;
  subTitle?: string;
  children: React.ReactNode;
  hint?: string;
}) {
  // 실제 리포트 페이지 wrap: max-w-3xl + ReportTocBar + article 구조 함축.
  const badgeBg = {
    success: 'bg-success-soft text-success',
    warning: 'bg-warning-soft text-warning',
    muted: 'bg-foreground/10 text-foreground-sub',
  }[badgeColor];

  return (
    <div className="rounded-3xl border border-border bg-surface shadow-sm">
      {/* 가짜 ReportTocBar (sticky 안내) */}
      <div className="flex items-center gap-3 border-b border-border bg-surface-soft px-5 py-2.5 text-[11px] text-foreground-sub">
        <span>📑 시세 · 흐름 · 학교 · 위치 · 총평</span>
        <span className="ml-auto rounded-full bg-foreground/5 px-2 py-0.5">미리보기</span>
      </div>

      <div className="p-5 sm:p-7">
        {/* 헤더 — 배지 + border-l-4 타이틀 */}
        <div className="mb-6">
          <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider ${badgeBg}`}>
            {badge}
          </span>
          <h3 className="mt-3 border-l-4 border-primary pl-4 text-xl font-bold leading-tight tracking-tight sm:text-2xl">
            {title}
          </h3>
          {subTitle ? (
            <p className="mt-2 pl-4 text-xs text-foreground-sub">{subTitle}</p>
          ) : null}
        </div>

        {children}

        {hint ? (
          <p className="mt-5 border-t border-border pt-4 text-xs text-foreground-sub">{hint}</p>
        ) : null}
      </div>
    </div>
  );
}

function FreePreview() {
  return (
    <PreviewFrame
      badge="FREE · 단지 심층 분석"
      badgeColor="success"
      title="여의도삼부"
      subTitle="서울 영등포구 여의도동 · 866세대 · 1975년 입주 · 84㎡ (공급 33평형)"
      hint="가구 형태에 따라 강조 항목이 달라져요 — 1인은 출퇴근/생활, 학부모는 학군/안전, 신혼은 자금/장기보유 시선으로."
    >
      {/* ProfileBadge — rounded-2xl border-primary/40 bg-primary-soft/40 */}
      <section className="overflow-hidden rounded-2xl border border-primary/40 bg-primary-soft/40 p-4 shadow-sm">
        <div className="flex items-start gap-3 break-keep">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-sm">
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-primary-ink">
                당신을 위한 관점
              </span>
              <span className="text-sm font-bold text-foreground">
                💑 신혼부부
                <span className="mx-2 text-foreground-sub">×</span>
                🚇 출퇴근 동선
              </span>
            </div>
            <p className="mt-1.5 text-[12px] leading-relaxed text-foreground/85">
              신혼부부 시점에서 지금의 출퇴근 동선과 5~10년 후 자녀 계획까지 이중으로 짚었어요.
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
              <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-foreground-sub">
                2순위 · 💰 가격
              </span>
              <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-foreground-sub">
                3순위 · 🏫 학군
              </span>
              <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-foreground-sub">
                🚇 광화문 출근
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* HookHighlights — Hero 1 (출퇴근) + SubCard 3 (시세/학교/규모) */}
      <div className="mt-5 space-y-3">
        {/* Hero — 1순위 transit 카드 (gradient bg) */}
        <div className="rounded-2xl border border-primary bg-gradient-to-br from-primary-soft/50 via-primary-soft/20 to-surface p-5">
          <div className="flex items-start justify-between">
            <span className="rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-semibold text-white">
              출퇴근
            </span>
            <span className="text-[10px] text-foreground-sub">광화문 통근 기준</span>
          </div>
          <div className="mt-3 flex items-end justify-between gap-3">
            <div>
              <div className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                25분
              </div>
              <div className="mt-0.5 text-xs text-foreground-sub">
                여의나루역 5호선 도보 5분
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-foreground-sub">↗ 환승 0회</div>
              <div className="mt-0.5 text-sm font-semibold text-success">대안 17건</div>
            </div>
          </div>
        </div>

        {/* SubCard 3장 — 시세 / 학교 / 규모 */}
        <div className="grid grid-cols-3 gap-3">
          <SubCard
            tone="warning"
            icon={<TrendingUp className="h-3.5 w-3.5" />}
            badge="시세"
            sub="↑ 6.2%"
            value="24.5억"
            footer="공급면적 기준"
          />
          <SubCard
            tone="success"
            icon={<GraduationCap className="h-3.5 w-3.5" />}
            badge="학군"
            sub="도보 5분"
            value="여의도초"
            footer="반경 1km · 4개교"
          />
          <SubCard
            tone="secondary"
            icon={<Home className="h-3.5 w-3.5" />}
            badge="규모"
            sub="49년차"
            value="866세대"
            footer="재건축 추진 중"
          />
        </div>
      </div>

      {/* LifeScenario 4시점 — 시간대를 배경 그라데이션으로 자연스럽게 표현 */}
      <h4 className="mt-6 mb-3 text-sm font-bold text-foreground">
        ☀️ 단지에서 보내는 하루
      </h4>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {[
          {
            time: '07:30',
            t: '아침',
            b: '여의나루 5분, 5호선 직진 광화문',
            // 떠오르는 해 — 따뜻한 amber, 아래에서 위로
            bg: 'bg-gradient-to-t from-amber-50 to-white',
            accent: 'bg-amber-300',
            timeColor: 'text-amber-700',
          },
          {
            time: '12:00',
            t: '점심',
            b: 'IFC몰·더현대 도보권 점심',
            // 한낮 정중앙 햇살 — 밝은 yellow
            bg: 'bg-gradient-to-b from-yellow-50 to-white',
            accent: 'bg-yellow-400',
            timeColor: 'text-yellow-700',
          },
          {
            time: '18:30',
            t: '저녁',
            b: '한강 노을, 여의도공원 산책',
            // 지는 해 — orange, 우상단에서 좌하단
            bg: 'bg-gradient-to-bl from-orange-100 to-white',
            accent: 'bg-orange-400',
            timeColor: 'text-orange-700',
          },
          {
            time: '21:00',
            t: '밤',
            b: '치안 양호, 한강 야경',
            // 밤하늘 — indigo, 위에서 어둡게
            bg: 'bg-gradient-to-t from-indigo-50 to-white',
            accent: 'bg-indigo-700',
            timeColor: 'text-indigo-700',
          },
        ].map((s) => (
          <div
            key={s.t}
            className={`overflow-hidden rounded-xl border border-border ${s.bg}`}
          >
            <div className={`h-0.5 ${s.accent}`} />
            <div className="p-3">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-bold text-foreground">{s.t}</span>
                <span className={`text-[10px] font-mono font-semibold ${s.timeColor}`}>
                  {s.time}
                </span>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-foreground/80">
                {s.b}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* 본문 마크다운 섹션 미리보기 — ## 💰 시세 (primary-soft 톤 + 핵심 숫자 하이라이터) */}
      <div className="mt-6 rounded-2xl border border-border bg-primary-soft/30 p-4">
        <h4 className="text-base font-bold text-foreground">💰 시세 — 같은 평형 기준</h4>
        <p className="mt-2 text-[13px] leading-relaxed text-foreground/85">
          최근 1년 전용{' '}
          <mark className="rounded bg-warning-soft px-1 font-bold text-foreground">
            84㎡
          </mark>{' '}
          거래는{' '}
          <mark className="rounded bg-warning-soft px-1 font-bold text-foreground">
            18건
          </mark>
          . 평균{' '}
          <mark className="rounded bg-warning-soft px-1 font-bold text-foreground">
            24.5억
          </mark>{' '}
          (공급 33평형 기준 평당 7,420만원). 12개월 전 23.0억 →{' '}
          <mark className="rounded bg-warning-soft px-1 font-bold text-success">
            +6.2%
          </mark>
          , 영등포 같은 평형 단지 중{' '}
          <mark className="rounded bg-warning-soft px-1 font-bold text-foreground">
            상위 4%
          </mark>
          에 해당해요…
        </p>
        <p className="mt-2 text-[11px] text-foreground-sub">⋯ 본문은 8섹션 약 1,200자로 이어져요</p>
      </div>
    </PreviewFrame>
  );
}

function SubCard({
  tone,
  icon,
  badge,
  sub,
  value,
  footer,
}: {
  tone: 'warning' | 'success' | 'secondary';
  icon: React.ReactNode;
  badge: string;
  sub: string;
  value: string;
  footer: string;
}) {
  const badgeBg = {
    warning: 'bg-warning text-white',
    success: 'bg-success text-white',
    secondary: 'bg-secondary text-white',
  }[tone];
  const subBg = {
    warning: 'bg-warning-soft text-warning',
    success: 'bg-success-soft text-success',
    secondary: 'bg-secondary/15 text-secondary',
  }[tone];

  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <div className="flex items-center justify-between">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${badgeBg}`}>
          {icon}
          {badge}
        </span>
        <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${subBg}`}>
          {sub}
        </span>
      </div>
      <div className="mt-2 text-base font-extrabold text-foreground sm:text-lg">{value}</div>
      <div className="mt-0.5 text-[10px] text-foreground-sub">{footer}</div>
    </div>
  );
}

function ComparePreview() {
  return (
    <PreviewFrame
      badge="PAID · 나란히 보기 990원"
      badgeColor="warning"
      title="여의도삼부 vs 시범아파트"
      subTitle="서울 영등포구 여의도동 · 같은 평형(전용 84㎡) 기준 비교"
      hint="우선순위에 따라 비교표 행이 자동 재배치돼요 — 학부모면 학군 위로, 신혼이면 자금 위로."
    >
      {/* ProfileBadge — 비교 시점 */}
      <section className="overflow-hidden rounded-2xl border border-primary/40 bg-primary-soft/40 p-4 shadow-sm">
        <div className="flex items-start gap-3 break-keep">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-sm">
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-primary-ink">
                비교 관점
              </span>
              <span className="text-sm font-bold text-foreground">
                💑 신혼부부
                <span className="mx-2 text-foreground-sub">×</span>
                💰 가격 효율
              </span>
            </div>
            <p className="mt-1.5 text-[12px] leading-relaxed text-foreground/85">
              가격 효율 시점이라, 평당가·상승률·자금 진입장벽 위주로 두 단지를 정렬했어요.
            </p>
          </div>
        </div>
      </section>

      {/* 한 장 요약 박스 */}
      <div className="mt-5 rounded-2xl border-l-4 border-primary bg-primary-soft/30 p-4">
        <p className="text-sm leading-relaxed text-foreground">
          가격 효율은 <strong>여의도삼부</strong>, 학군 폭과 커뮤니티는 <strong>시범아파트</strong>. 같은 자금이라면 평당가 차이만큼 다른 가치를 사는 셈이에요.
        </p>
      </div>

      {/* 비교 표 — 실제 비교 리포트의 표 패턴 */}
      <div className="mt-5 overflow-hidden rounded-2xl border border-border">
        <div className="grid grid-cols-3 gap-px bg-border text-sm">
          {/* 헤더 */}
          <div className="bg-surface-soft p-3 text-[11px] font-semibold text-foreground-sub">항목</div>
          <div className="bg-primary-soft/60 p-3 text-center font-bold text-foreground">
            <div className="text-[10px] font-semibold text-primary-ink">A</div>
            여의도삼부
          </div>
          <div className="bg-success-soft/60 p-3 text-center font-bold text-foreground">
            <div className="text-[10px] font-semibold text-success">B</div>
            시범아파트
          </div>

          {/* 데이터 행 */}
          {([
            { label: '평당가 (84㎡)', a: '7,420만원', b: '8,180만원', winner: 'a' },
            { label: '12개월 상승률', a: '+6.2%', b: '+4.8%', winner: 'a' },
            { label: '역 도보', a: '여의나루 5분', b: '여의도 8분', winner: 'a' },
            { label: '세대수 / 연식', a: '866 / 1975', b: '1,584 / 1971', winner: 'b' },
            { label: '학군 (1km)', a: '4개교', b: '6개교', winner: 'b' },
          ] as const).map((row) => (
            <RowCells key={row.label} {...row} />
          ))}
        </div>

        {/* AI 비교 총평 */}
        <div className="border-t border-border bg-primary-soft/30 p-4">
          <div className="flex items-center gap-1.5 text-xs font-bold text-primary-ink">
            <Sparkles className="h-3.5 w-3.5" />
            AI 비교 총평
          </div>
          <p className="mt-1.5 text-[13px] leading-relaxed text-foreground/85">
            <strong>여의도삼부</strong>는 단위 가격이 9% 저렴하고 12개월 상승률도 1.4%p 앞서 가격 효율이 더 좋아요. 다만 세대수·학군 폭은 <strong>시범아파트</strong>가 우위라 자녀 계획이 가까우면 시범 쪽 정주성이 강합니다.
          </p>
        </div>
      </div>

      {/* 시세 흐름 비교 미니 — AI 비교 총평과 동일한 톤(primary-soft) */}
      <div className="mt-5 rounded-2xl border border-border bg-primary-soft/30 p-4">
        <h4 className="text-base font-bold text-foreground">📈 시세 흐름 비교</h4>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <FlowMini name="여의도삼부" delta="+6.2%" tone="success" />
          <FlowMini name="시범아파트" delta="+4.8%" tone="warning" />
        </div>
        <p className="mt-3 text-[11px] text-foreground-sub">⋯ 같은 평형끼리만 비교, 12개월 18·22건 기준</p>
      </div>
    </PreviewFrame>
  );
}

function RowCells({
  label,
  a,
  b,
  winner,
}: {
  label: string;
  a: string;
  b: string;
  winner: 'a' | 'b';
}) {
  const winClass = 'font-bold text-primary';
  return (
    <>
      <div className="bg-surface p-3 text-[11px] text-foreground-sub">{label}</div>
      <div className={`bg-surface p-3 text-center text-sm ${winner === 'a' ? winClass : ''}`}>
        {a}
      </div>
      <div className={`bg-surface p-3 text-center text-sm ${winner === 'b' ? winClass : ''}`}>
        {b}
      </div>
    </>
  );
}

function FlowMini({
  name,
  delta,
  tone,
}: {
  name: string;
  delta: string;
  tone: 'success' | 'warning';
}) {
  const bars = tone === 'success'
    ? [40, 48, 52, 60, 70, 78]
    : [50, 54, 56, 60, 64, 68];
  const barColor = tone === 'success' ? 'bg-success' : 'bg-warning';
  const deltaColor = tone === 'success' ? 'text-success' : 'text-warning';

  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-bold text-foreground">{name}</span>
        <span className={`text-sm font-bold ${deltaColor}`}>{delta}</span>
      </div>
      <div className="mt-2 flex h-10 items-end gap-1">
        {bars.map((h, i) => (
          <span
            key={i}
            style={{ height: `${h}%` }}
            className={`flex-1 rounded-sm opacity-80 ${barColor}`}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[9px] text-foreground-sub">
        <span>12mo</span>
        <span>최근</span>
      </div>
    </div>
  );
}

function TbdPreview() {
  return (
    <div className="rounded-3xl border-2 border-dashed border-border bg-surface-soft p-6 sm:p-8">
      <div className="mb-4 flex items-center gap-2">
        <span className="rounded-full bg-foreground/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-foreground-sub">
          TBD
        </span>
        <h3 className="text-base font-bold text-foreground">🚧 어떤 걸 더 풀어드릴지 고민 중</h3>
      </div>
      <p className="text-sm leading-relaxed text-foreground-sub">
        다음 슬롯에 들어갈 기능이 아직 미정입니다. 후보 4종:
      </p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {[
          { e: '🔄', t: '갈아타기 한 장', d: '지금 집 매도가 + 목표 단지 매수가 + 자금 차액 + 대출 시뮬' },
          { e: '🎓', t: '학군 심층', d: '배정 학교 정확 매칭 + 진학 통계 + 학원가 거리' },
          { e: '📲', t: '시세 변동 알림', d: '관심 단지 주간 SMS 푸시 (재방문 루프)' },
          { e: '💰', t: '전세 분석', d: '전세가율·갭 추이 + 동일 가격대 단지' },
        ].map((c) => (
          <li
            key={c.t}
            className="flex items-start gap-2.5 rounded-xl border border-border bg-surface p-3"
          >
            <span className="mt-0.5 text-lg">{c.e}</span>
            <div>
              <div className="text-sm font-bold text-foreground">{c.t}</div>
              <p className="mt-0.5 text-[11px] leading-relaxed text-foreground-sub">{c.d}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-5 text-[11px] leading-relaxed text-foreground-sub">
        확정되면 여기에 진짜 미리보기 띄워드릴게요. 지금은 무료(혼자 살래 둘이 살래?) + 990원(옆 단지 비교) 두 개로 충분히 까볼 수 있어요.
      </p>
    </div>
  );
}
