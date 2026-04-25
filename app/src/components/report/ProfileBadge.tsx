import { Sparkles } from 'lucide-react';
import Link from 'next/link';
import {
  HOUSEHOLD_LABELS,
  HOUSEHOLD_EMOJIS,
  PRIORITY_LABELS,
  PRIORITY_EMOJIS,
  COMMUTE_LABELS,
  type HouseholdType,
  type Priority,
  type CommuteArea,
} from '@/types/profile';

interface Props {
  conditions: {
    householdType?: HouseholdType;
    priorities?: Priority[];
    commuteArea?: CommuteArea;
  };
}

// 가구 + 1순위 조합으로 "이 리포트가 어떤 시점으로 풀렸는지" 한 문단 설명.
// 직접 화법으로 "당신을 위해 이렇게 정리했어요" 톤.
function buildPerspectiveLine(
  household: HouseholdType,
  topPriority: Priority | undefined
): string {
  const lensMap: Record<Priority, string> = {
    transport: '출퇴근 동선',
    school: '학군과 통학 환경',
    convenience: '생활 편의와 상권',
    quiet: '주거 분위기',
    newbuild: '연식과 시설 상태',
    size: '평수와 단지 규모',
    price: '가격 안정성',
    community: '단지 커뮤니티',
  };
  const lens = topPriority ? lensMap[topPriority] : '입지 전반';

  switch (household) {
    case 'single':
      return `1인가구로서 ${lens}이 가장 중요하시니까, 자기 동선과 일상 동선부터 풀어드렸어요.`;
    case 'couple':
      return `2인가구의 ${lens} 관점에서 정주 안정성과 둘만의 일상 동선 위주로 정리했어요.`;
    case 'newlywed':
      return `신혼부부 시점에서 지금의 ${lens}과 5~10년 후 자녀 계획까지 이중으로 짚었어요.`;
    case 'family_kids':
      return `자녀 있는 가족의 ${lens} 관점이라, 통학로·학군·가족 외식 동선을 먼저 풀었어요.`;
    case 'school_parent':
      return `학군 중심 학부모의 관점이라, 배정 학교와 학원가 접근성을 가장 깊게 다뤘어요.`;
    case 'retired':
      return `은퇴 후 정주 관점에서 ${lens}, 의료·산책 동선을 우선해서 정리했어요.`;
    case 'investor':
      return `참고용 데이터 정리 요청이라 ${lens} 측면의 객관 지표 위주로만 풀었어요.`;
  }
}

export default function ProfileBadge({ conditions }: Props) {
  if (!conditions || !conditions.householdType) return null;

  const householdType = conditions.householdType;
  const priorities = conditions.priorities ?? [];
  const commuteArea = conditions.commuteArea;
  const topPriority = priorities[0];

  return (
    <section className="overflow-hidden rounded-2xl border border-primary/40 bg-primary-soft/40 p-5 shadow-sm">
      <div className="flex items-start gap-3 break-keep">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-sm">
          <Sparkles className="h-5 w-5" />
        </span>
        <div className="flex-1">
          {/* 한 줄 시그니처 */}
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-primary-ink">
              당신을 위한 관점
            </span>
            <span className="text-base font-bold text-foreground">
              {HOUSEHOLD_EMOJIS[householdType]} {HOUSEHOLD_LABELS[householdType]}
              {topPriority ? (
                <>
                  <span className="mx-2 text-foreground-sub">×</span>
                  {PRIORITY_EMOJIS[topPriority]} {PRIORITY_LABELS[topPriority]}
                </>
              ) : null}
            </span>
          </div>

          {/* 풀어드린 방식 한 문단 */}
          <p className="mt-2 text-[13px] leading-relaxed text-foreground/85">
            {buildPerspectiveLine(householdType, topPriority)}
          </p>

          {/* 보조 칩 */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px]">
            {priorities.slice(1, 3).map((p, i) => (
              <span
                key={p}
                className="rounded-full border border-border bg-surface px-2 py-0.5 text-foreground-sub"
              >
                {i + 2}순위 · {PRIORITY_EMOJIS[p]} {PRIORITY_LABELS[p]}
              </span>
            ))}
            {commuteArea && commuteArea !== 'none' && commuteArea !== 'etc' ? (
              <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-foreground-sub">
                🚇 {COMMUTE_LABELS[commuteArea]} 출근
              </span>
            ) : null}
            <Link
              href="/analyze/profile"
              className="ml-auto rounded-full px-2 py-0.5 text-[11px] text-primary-ink hover:underline"
            >
              관점 바꿔서 다시 보기 →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
