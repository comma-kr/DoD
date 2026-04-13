import { User } from 'lucide-react';
import Link from 'next/link';
import {
  HOUSEHOLD_LABELS,
  HOUSEHOLD_EMOJIS,
  PRIORITY_LABELS,
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

export default function ProfileBadge({ conditions }: Props) {
  if (!conditions || !conditions.householdType) return null;

  const householdType = conditions.householdType;
  const priorities = conditions.priorities ?? [];
  const commuteArea = conditions.commuteArea;

  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <User className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-lg">{HOUSEHOLD_EMOJIS[householdType]}</span>
            <span className="font-semibold text-foreground">
              {HOUSEHOLD_LABELS[householdType]}
            </span>
            <span className="text-xs text-foreground-sub">기준으로 작성됐어요</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
            {priorities.slice(0, 3).map((p, i) => (
              <span
                key={p}
                className="rounded-full bg-background px-2 py-0.5 text-foreground-sub"
              >
                {i + 1}순위 · {PRIORITY_LABELS[p]}
              </span>
            ))}
            {commuteArea && commuteArea !== 'none' && commuteArea !== 'etc' ? (
              <span className="rounded-full bg-background px-2 py-0.5 text-foreground-sub">
                🚇 {COMMUTE_LABELS[commuteArea]} 출근
              </span>
            ) : null}
          </div>
          <Link
            href="/analyze/profile"
            className="mt-3 inline-block text-xs text-primary hover:underline"
          >
            조건을 바꿔서 다시 보기 →
          </Link>
        </div>
      </div>
    </div>
  );
}
