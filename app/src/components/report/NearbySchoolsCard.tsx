// 주변 학교 초·중·고 (각 레벨별 가장 가까운 1곳)
// HookHighlights의 단일 "가장 가까운 학교" 카드를 보완. 학부모/예비 학부모용.
// 배정 학교는 우리가 책임지는 정보가 아님 — 학교알리미 안내 한 줄로 끝.

import { GraduationCap } from 'lucide-react';
import { CARD_TINT } from '@/lib/card-tint';
import type { NearbySchool } from '@/lib/kakao-local';

interface Props {
  schools: NearbySchool[];
}

interface Slot {
  type: '초등학교' | '중학교' | '고등학교';
  badge: string;
  badgeClass: string;
}

const SLOTS: Slot[] = [
  { type: '초등학교', badge: '초', badgeClass: 'bg-success text-white' },
  { type: '중학교',   badge: '중', badgeClass: 'bg-primary text-white' },
  { type: '고등학교', badge: '고', badgeClass: 'bg-warning text-white' },
];

function shorten(name: string): string {
  return name
    .replace(/초등학교$/, '초')
    .replace(/중학교$/, '중')
    .replace(/고등학교$/, '고')
    .replace(/고교$/, '고');
}

function walkMin(distM: number): number {
  return Math.max(1, Math.round(distM / 70)); // 70m/min ≈ 한국 보행속도 기준
}

export default function NearbySchoolsCard({ schools }: Props) {
  // 레벨별로 가장 가까운 1곳씩 — schools는 이미 거리순 정렬돼서 first match만 잡으면 됨
  const byLevel: Partial<Record<Slot['type'], NearbySchool>> = {};
  for (const s of schools) {
    if ((s.type === '초등학교' || s.type === '중학교' || s.type === '고등학교') && !byLevel[s.type]) {
      byLevel[s.type] = s;
    }
  }

  // 어느 레벨도 없으면 카드 자체 노출 안 함
  const hasAny = SLOTS.some((slot) => byLevel[slot.type]);
  if (!hasAny) return null;

  return (
    <section
      className={`rounded-3xl border border-border bg-surface p-6 shadow-sm ${CARD_TINT.success}`}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <div className="flex items-center gap-2 whitespace-nowrap">
          <GraduationCap className="h-5 w-5 text-foreground-sub" />
          <h3 className="text-base font-bold">🏫 주변 학교 초·중·고</h3>
        </div>
        <span className="text-[11px] text-foreground-sub">· 단지 반경 2km, 직선거리</span>
      </div>
      <p className="mt-1 text-xs text-foreground-sub">
        걸어서 가까운 초·중·고 1곳씩 추려봤어요. 정확한 배정 학교는 학교알리미에서 한 번 더 확인.
      </p>

      <ul className="mt-4 divide-y divide-border-soft border-y border-border-soft">
        {SLOTS.map((slot) => {
          const s = byLevel[slot.type];
          return (
            <li key={slot.type} className="flex items-center gap-3 py-3">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${slot.badgeClass}`}
              >
                {slot.badge}
              </span>
              {s ? (
                <>
                  <span className="flex-1 truncate font-bold text-foreground">
                    {shorten(s.name)}
                  </span>
                  <span className="shrink-0 text-[12px] font-extrabold text-foreground">
                    <span className="report-highlight">도보 {walkMin(s.distanceM)}분</span>
                    <span className="ml-1.5 text-[10px] font-normal text-foreground-sub">
                      · {s.distanceM.toLocaleString()}m
                    </span>
                  </span>
                </>
              ) : (
                <span className="flex-1 text-[12px] text-foreground-sub">
                  반경 2km 내 {slot.type} 없음
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
