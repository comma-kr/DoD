// 🚌 회사 통근버스 카드 — CommuteGrid 옆 재미 섹터.
// SK하이닉스(이천)·삼성전자(수원/기흥/평택)·네이버(판교)·LG(마곡) 등.
// 같은 단지에서 출발하는 셔틀이 있는지 큐레이션 데이터 기반으로 안내.

import { Bus } from 'lucide-react';
import type { ShuttleStop } from '@/lib/district-insights';

interface Props {
  shuttles?: ShuttleStop[];
  district?: string;
}

export default function ShuttleCard({ shuttles, district }: Props) {
  // 데이터 없거나 빈 배열이면 노출 안 함
  if (!shuttles || shuttles.length === 0) return null;

  return (
    <section className="rounded-3xl border border-border bg-surface p-6 shadow-sm break-keep">
      <div className="flex items-center gap-2">
        <Bus className="h-5 w-5 text-foreground-sub" />
        <h3 className="text-base font-bold">🚌 통근버스 운행 회사</h3>
        <span className="ml-1 text-xs text-foreground-sub">
          · {district ?? '권역'} 일대
        </span>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-foreground-sub">
        성과급으로 핫한 SK하이닉스·삼성전자처럼, 회사 통근버스가 이 권역에서
        운행하는지 정리했어요. 단지 인근 정류장은 직접 회사 통근 시스템에서
        확인해보세요.
      </p>

      <div className="mt-5 grid auto-rows-fr gap-3 break-keep sm:grid-cols-2">
        {shuttles.map((s, i) => (
          <div
            key={i}
            className="flex flex-col rounded-2xl border border-warning/30 bg-warning-soft p-4"
          >
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-warning">
              <Bus className="h-3.5 w-3.5" />
              SHUTTLE {String(i + 1).padStart(2, '0')}
            </div>
            <div className="mt-2 text-base font-bold text-foreground">
              {s.company}
            </div>
            <div className="mt-1 text-[12px] leading-relaxed text-foreground-sub">
              → {s.destination}
            </div>
            {s.walkMin ? (
              <div className="mt-auto pt-2 text-[11px] font-semibold text-warning">
                정류장 도보 {s.walkMin}분
              </div>
            ) : (
              <div className="mt-auto pt-2 text-[11px] text-foreground-sub">
                정류장 위치는 회사 통근 시스템에서 확인
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="mt-4 text-[10px] text-foreground-sub">
        ※ 권역 큐레이션 정보예요. 실제 정류장·운행 노선·시간은 회사 통근
        시스템(임직원용)에서 확인 필요.
      </p>
    </section>
  );
}
