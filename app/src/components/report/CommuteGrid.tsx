import { Clock, Briefcase } from 'lucide-react';
import { getApartmentCommuteGridAsync, getCommuteGridByCodeAsync, getVerdictColor, type ApartmentCommuteEstimate } from '@/lib/commute-matrix';
import { type CommuteArea } from '@/types/profile';
import { CARD_TINT, type TintTone } from '@/lib/card-tint';
import type { ShuttleStop } from '@/lib/district-insights';

interface Props {
  address: string;
  regionCode?: string | null; // 시군구 5자리 — 충돌 회피 매칭. 없으면 이름 기반 fallback.
  apartmentId?: string | null;
  apartmentLat?: number | null;
  apartmentLng?: number | null;
  highlightArea?: CommuteArea | null;
  shuttles?: ShuttleStop[];
  lifestyleMode?: boolean; // 출퇴근 안 하는 분(은퇴/재택 등) — 헤더·셔틀 톤 변경
}

// 회사별 위트 한 줄 — 캐주얼하게, "이 권역에 셔틀 다녀요" 신호 흘리기용
function pickShuttleHook(s: ShuttleStop): { icon: string; line: string } {
  const c = s.company;
  const dest = s.destination;
  if (c.includes('SK하이닉스')) return { icon: '💸', line: `성과급 잔치로 시끌하던 SK하이닉스, ${dest}까지 셔틀 다녀요` };
  if (c.includes('삼성전자')) return { icon: '📱', line: `갤럭시 만드는 그곳, 삼성전자 ${dest} 셔틀도 있어요` };
  if (c.includes('네이버')) return { icon: '💚', line: `라인프렌즈 본진 네이버 ${dest}까지 셔틀` };
  if (c.includes('카카오')) return { icon: '💛', line: `라이언이 출퇴근하는 카카오 ${dest} 셔틀` };
  if (c.includes('LG')) return { icon: '✨', line: `LG ${dest} 사옥까지 셔틀도 다녀요` };
  if (c.includes('SM') || c.includes('크래프톤') || c.includes('무신사')) {
    return { icon: '🎤', line: `NCT·배그·무신사 본진 다 여기 — ${dest} 도보권` };
  }
  return { icon: '🚌', line: `${c} ${dest} 셔틀 다녀요` };
}

// verdict → 공용 tint tone 매핑
const verdictTone: Record<string, TintTone> = {
  최적: 'success',
  편리: 'primary',
  보통: 'warning',
  불편: 'danger',
};

export default async function CommuteGrid({ address, regionCode, apartmentId, apartmentLat, apartmentLng, highlightArea, shuttles, lifestyleMode = false }: Props) {
  // 서울 구 + 인천 군구 + 경기 시군 모두 매칭
  const district =
    address.match(/(\S+구)/)?.[1] ??
    address.match(/(\S+시)(?!\s+\S+구)/)?.[1] ??
    address.match(/(\S+군)/)?.[1] ??
    '';

  if (!district) {
    return null;
  }

  // 단지 좌표 + apartmentId가 있으면 ODSay로 단지×CBD 정밀 매칭, 없으면 시군구 매트릭스 fallback
  const origin =
    apartmentLat !== null && apartmentLat !== undefined && apartmentLng !== null && apartmentLng !== undefined
      ? { lat: apartmentLat, lng: apartmentLng }
      : null;

  let grid: Array<{ area: CommuteArea; label: string; estimate: ApartmentCommuteEstimate | null }>;
  if (apartmentId) {
    grid = await getApartmentCommuteGridAsync(apartmentId, origin, regionCode, district);
  } else {
    const matrixGrid = await getCommuteGridByCodeAsync(regionCode, district);
    grid = matrixGrid.map((g) => ({
      ...g,
      estimate: g.estimate ? { ...g.estimate, source: 'matrix' as const } : null,
    }));
  }

  const hasData = grid.some((g) => g.estimate !== null);

  // 모드별 헤더·문구 분기 — 은퇴/재택 분은 "업무지" 표현 안 어울림
  const headerTitle = lifestyleMode ? '주요 권역 접근성' : '주요 업무지까지';
  const headerNote = lifestyleMode
    ? '자녀 방문·외출 동선 참고예요. 실제 시간대·환승 대기에 따라 달라질 수 있어요.'
    : '참고 수치예요. 실제 시간대와 환승 대기에 따라 달라질 수 있어요.';

  if (!hasData) {
    return (
      <div className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-foreground-sub" />
          <h3 className="text-base font-bold">{headerTitle}</h3>
        </div>
        <p className="mt-3 text-sm text-foreground-sub">
          {district} 기준 실시간 대중교통 데이터가 아직 수집되지 않았어요.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <Briefcase className="h-5 w-5 text-foreground-sub" />
        <h3 className="text-base font-bold">{headerTitle}</h3>
        <span className="ml-1 text-xs text-foreground-sub">
          · {district} 기준
        </span>
      </div>
      <p className="mt-1 text-xs text-foreground-sub">{headerNote}</p>

      <div className="mt-5 grid auto-rows-fr grid-cols-2 gap-2 break-keep sm:grid-cols-3 lg:grid-cols-4">
        {grid.map(({ area, label, estimate }) => {
          const active = area === highlightArea;
          if (!estimate) {
            return (
              <div
                key={area}
                className="rounded-2xl border border-border bg-surface-soft p-3 opacity-50"
              >
                <div className="text-xs font-semibold text-foreground-sub">
                  {label}
                </div>
                <div className="mt-2 text-xs text-foreground-sub">-</div>
              </div>
            );
          }
          const tint =
            CARD_TINT[verdictTone[estimate.verdict] ?? 'neutral'];
          return (
            <div
              key={area}
              className={`rounded-2xl border border-border bg-surface p-3 shadow-sm transition ${
                active
                  ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
                  : tint
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-foreground">
                  {label}
                  {active ? (
                    <span className="ml-1 text-[10px] font-bold text-primary">
                      · 내 출근지
                    </span>
                  ) : null}
                </div>
                <span
                  className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${getVerdictColor(estimate.verdict)}`}
                >
                  {estimate.verdict}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-1 text-sm font-extrabold text-foreground">
                <Clock className="h-3 w-3 text-foreground-sub" />
                <span className="report-highlight">
                  {estimate.minMinutes}~{estimate.maxMinutes}분
                </span>
              </div>
              <div className="mt-1 text-[10px] text-foreground-sub">
                {estimate.transferCount === 0 ? '직결' : `환승 ${estimate.transferCount}회`}
              </div>
              {estimate.source === 'odsay' && estimate.hops?.firstStation ? (
                <div className="mt-1 text-[10px] text-foreground-sub line-clamp-1">
                  {estimate.hops.firstStation} → {estimate.hops.lastStation ?? ''}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {!lifestyleMode && shuttles && shuttles.length > 0
        ? (() => {
            const hook = pickShuttleHook(shuttles[0]);
            return (
              <div className="mt-4 flex items-center gap-2 rounded-2xl border border-warning/30 bg-warning-soft px-3 py-2.5 text-xs leading-relaxed">
                <span className="text-base">{hook.icon}</span>
                <span className="font-semibold text-foreground">{hook.line}</span>
                {shuttles.length > 1 ? (
                  <span className="ml-auto whitespace-nowrap text-[10px] text-foreground-sub">
                    외 {shuttles.length - 1}개 회사
                  </span>
                ) : null}
              </div>
            );
          })()
        : null}
    </div>
  );
}
