// 리포트 헤더 아래 4분할 메타 그리드 — 노량진 byline 차용.
// 'SUBJECT / PERSPECTIVE / PRIORITY / DATE' 라벨 + 값 형식.

import { formatDate } from '@/lib/utils';
import {
  HOUSEHOLD_LABELS,
  HOUSEHOLD_EMOJIS,
  PRIORITY_LABELS,
  PRIORITY_EMOJIS,
  type HouseholdType,
  type Priority,
} from '@/types/profile';

interface Props {
  subject: string; // 단지명 또는 비교 단지명들
  householdType?: HouseholdType | null;
  priorityTop?: Priority | null;
  createdAt: string; // ISO
}

interface Cell {
  label: string;
  value: string;
}

export default function ReportByline({
  subject,
  householdType,
  priorityTop,
  createdAt,
}: Props) {
  const cells: Cell[] = [
    { label: 'SUBJECT', value: subject || '—' },
    {
      label: 'PERSPECTIVE',
      value: householdType
        ? `${HOUSEHOLD_EMOJIS[householdType]} ${HOUSEHOLD_LABELS[householdType]}`
        : '—',
    },
    {
      label: 'PRIORITY',
      value: priorityTop
        ? `${PRIORITY_EMOJIS[priorityTop]} ${PRIORITY_LABELS[priorityTop]}`
        : '—',
    },
    { label: 'DATE', value: formatDate(createdAt) },
  ];

  return (
    <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 border-y border-border py-4 sm:grid-cols-4">
      {cells.map((c) => (
        <div key={c.label} className="flex flex-col gap-1">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground-sub">
            {c.label}
          </span>
          <span className="break-keep text-sm font-semibold text-foreground">
            {c.value}
          </span>
        </div>
      ))}
    </div>
  );
}
