'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Building2,
  BarChart3,
  HelpCircle,
  ChevronDown,
  Train,
  School,
  Wallet,
  Sparkles,
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
            <div className="mt-6 rounded-3xl border border-border bg-surface p-6 shadow-sm sm:p-8">
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

  // 펼친 카드는 primary 보더 + soft 배경으로 표시.
  // placeholder는 고유의 점선 스타일 유지.
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
// 미리보기 — 정적 mock. 실 리포트 톤·구조 동일하게.
// ──────────────────────────────────────────────────────────

function FreePreview() {
  return (
    <div>
      <div className="mb-5 flex items-center gap-2 text-sm font-semibold text-foreground">
        <span className="rounded-full bg-success-soft px-2.5 py-1 text-xs font-semibold text-success">
          무료
        </span>
        이렇게 한 장에 풀어드려요 — <span className="text-foreground-sub">신혼 시선으로 보는 여의도삼부</span>
      </div>

      <div className="rounded-2xl border border-border bg-surface-soft p-5">
        <div className="flex items-baseline justify-between gap-3 border-b border-border pb-3">
          <div>
            <div className="text-base font-bold">여의도삼부</div>
            <div className="text-xs text-foreground-sub">서울 영등포구 여의도동 · 1975년 입주</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-foreground-sub">전용 84㎡ · 공급 33평형</div>
            <div className="text-base font-bold text-primary">24.5억</div>
          </div>
        </div>

        <ul className="mt-4 space-y-2.5 text-sm">
          <li className="flex items-start gap-2.5">
            <Train className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>
              <strong>출근</strong> — 광화문 25분 / 강남 35분 / 판교 50분
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <School className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>
              <strong>학교</strong> — 여의도초·중·고 도보 5분 내, 어린이집 12곳
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>
              <strong>시세</strong> — 12개월 +6.2%, 같은 평형 기준 영등포 상위 4%
            </span>
          </li>
        </ul>

        <div className="mt-4 rounded-xl bg-primary-soft p-3 text-sm leading-relaxed text-foreground">
          <span className="font-bold text-primary">TL;DR </span>
          신혼 시선이면 직장 접근성 ★★★★★, 학군 ★★★★★. 단 평당가 1.4배 프리미엄. 30년 차 재건축 기대 vs 자금 진입장벽이 큰 단지.
        </div>
      </div>

      <p className="mt-4 text-xs text-foreground-sub">
        🪪 가구 형태에 따라 강조 항목이 달라져요 — 1인은 출퇴근/생활편의, 학부모는 학군/안전, 신혼은 자금/장기보유 시선으로.
      </p>
    </div>
  );
}

function ComparePreview() {
  return (
    <div>
      <div className="mb-5 flex items-center gap-2 text-sm font-semibold text-foreground">
        <span className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary">
          990원
        </span>
        두 단지 한눈에 나란히 — <span className="text-foreground-sub">여의도삼부 vs 시범아파트</span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface-soft">
        <div className="grid grid-cols-3 gap-px bg-border text-sm">
          {/* 헤더 */}
          <div className="bg-surface-soft p-3 text-xs font-semibold text-foreground-sub">항목</div>
          <div className="bg-surface-soft p-3 text-center font-bold">여의도삼부</div>
          <div className="bg-surface-soft p-3 text-center font-bold">시범아파트</div>

          {/* 데이터 행 */}
          {([
            { label: '평당가 (84㎡)', a: '7,420만원', b: '8,180만원', winner: 'a' },
            { label: '역까지 도보', a: '여의나루 5분', b: '여의도 8분', winner: 'a' },
            { label: '세대수', a: '866세대', b: '1,584세대', winner: 'b' },
            { label: '12개월 상승률', a: '+6.2%', b: '+4.8%', winner: 'a' },
            { label: '학군 (반경 1km)', a: '초·중·고 4개교', b: '초·중·고 6개교', winner: 'b' },
          ] as const).map((row) => (
            <RowCells key={row.label} {...row} />
          ))}
        </div>

        <div className="border-t border-border bg-surface p-4 text-sm leading-relaxed">
          <div className="flex items-center gap-1.5 font-bold text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            AI 비교 총평
          </div>
          <p className="mt-1.5 text-foreground-sub">
            가격 효율은 <strong className="text-foreground">여의도삼부</strong>, 학군 폭과 커뮤니티는 <strong className="text-foreground">시범아파트</strong>. 같은 자금이라면 평당가 차이만큼 다른 가치를 사는 셈.
          </p>
        </div>
      </div>

      <p className="mt-4 text-xs text-foreground-sub">
        💡 우선순위에 따라 비교표 행이 자동 재배치돼요 — 학부모면 학군 위로, 신혼이면 자금 위로.
      </p>
    </div>
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
      <div className="bg-surface p-3 text-xs text-foreground-sub">{label}</div>
      <div className={`bg-surface p-3 text-center text-sm ${winner === 'a' ? winClass : ''}`}>
        {a}
      </div>
      <div className={`bg-surface p-3 text-center text-sm ${winner === 'b' ? winClass : ''}`}>
        {b}
      </div>
    </>
  );
}

function TbdPreview() {
  return (
    <div>
      <div className="mb-5 flex items-center gap-2 text-sm font-semibold text-foreground">
        <span className="rounded-full bg-foreground/10 px-2.5 py-1 text-xs font-semibold text-foreground-sub">
          TBD
        </span>
        🚧 어떤 걸 더 풀어드릴지 고민 중이에요
      </div>

      <div className="rounded-2xl border-2 border-dashed border-border bg-surface-soft p-6">
        <p className="text-sm leading-relaxed text-foreground-sub">
          1,990원~ 자리에 들어갈 다음 기능이 아직 미정입니다. 후보 중에는:
        </p>
        <ul className="mt-4 space-y-2.5 text-sm text-foreground">
          <li className="flex items-start gap-2.5">
            <span className="mt-0.5 text-base">🔄</span>
            <span>
              <strong>갈아타기 한 장</strong> — 지금 집 팔고 옮겨갈 수 있을까. 자금 차액 + 대출 시뮬
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="mt-0.5 text-base">🎓</span>
            <span>
              <strong>학군 심층</strong> — 배정 학교 정확 매칭 + 진학 통계 + 학원가 거리
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="mt-0.5 text-base">📲</span>
            <span>
              <strong>시세 변동 알림</strong> — 관심 단지 주간 SMS 푸시
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="mt-0.5 text-base">💰</span>
            <span>
              <strong>전세 분석</strong> — 전세가율·갭 추이 + 동일 가격대 단지
            </span>
          </li>
        </ul>
        <p className="mt-5 text-xs leading-relaxed text-foreground-sub">
          확정되면 여기에 진짜 미리보기 띄워드릴게요. 지금은 무료(혼자 살래 둘이 살래?) + 990원(옆 단지 비교) 두 개로 충분히 까볼 수 있어요.
        </p>
      </div>
    </div>
  );
}
