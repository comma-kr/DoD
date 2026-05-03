import { Clock, MapPin, Info } from 'lucide-react';
import { generateRouteOptions } from '@/lib/route-options';
import { LINE_COLOR, type LineCode, type SubwayHop } from '@/lib/subway-paths';
import { getTransitPath, CBD_COORDS } from '@/lib/transit-path';
import { COMMUTE_LABELS, type CommuteArea } from '@/types/profile';

// 호선 풀네임 — 칩 표시용 (LINE_COLOR.label은 짧은 약어, 화면에는 풀네임이 더 친숙)
const LINE_FULL_LABEL: Record<LineCode, string> = {
  '1': '1호선',
  '2': '2호선',
  '3': '3호선',
  '4': '4호선',
  '5': '5호선',
  '6': '6호선',
  '7': '7호선',
  '8': '8호선',
  '9': '9호선',
  BD: '분당선',
  SBD: '신분당선',
  GJ: '경의·중앙선',
  AR: '공항철도',
  GTXA: 'GTX-A',
};

// 호선 칩 — 서울 지하철 공식 컬러. compact 모드는 약어 (LINE_COLOR.label) 사용.
function LineChip({ line, compact }: { line: LineCode; compact?: boolean }) {
  const c = LINE_COLOR[line];
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded font-bold leading-tight whitespace-nowrap ${
        compact ? 'px-1 py-0 text-[9px]' : 'rounded-md px-2 py-0.5 text-[10px]'
      }`}
      style={{ background: c.bg, color: c.fg }}
    >
      {compact ? c.label : LINE_FULL_LABEL[line]}
    </span>
  );
}

// 버스 칩 — 서울 시내버스 권역색 (간선 파랑 / 지선 초록 / 광역 빨강).
// busNo 기준 휴리스틱 분류.
function BusChip({ busNote, compact }: { busNote: string; compact?: boolean }) {
  const m = busNote.match(/^(\S+?)번/);
  const label = m ? `${m[1]}` : busNote.split('·')[0].trim();
  const num = parseInt(m?.[1] ?? '', 10);
  let bg = '#3D5BA9';
  if (!isNaN(num)) {
    if (num >= 9000) bg = '#E60012';
    else if (num >= 1000) bg = '#3CB44C';
    else bg = '#3D5BA9';
  }
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded font-bold leading-tight ${
        compact ? 'px-1 py-0 text-[9px]' : 'rounded-md min-w-[36px] px-1.5 py-0.5 text-[10px]'
      }`}
      style={{ background: bg, color: '#FFFFFF' }}
    >
      {compact ? label : `${label}번`}
    </span>
  );
}

// 경로 모드 판별 — hop들의 rideLine 분포로 판정
type PathMode = 'subway' | 'bus' | 'mixed' | 'unknown';
function pathModeOf(hops: SubwayHop[]): PathMode {
  const sub = hops.filter((h) => h.rideLine).length;
  const oth = hops.filter((h) => !h.rideLine && h.role !== 'arrive').length;
  if (sub > 0 && oth === 0) return 'subway';
  if (sub === 0 && oth > 0) return 'bus';
  if (sub > 0 && oth > 0) return 'mixed';
  return 'unknown';
}
function displayIconOf(mode: PathMode, fallback: string): string {
  if (mode === 'subway') return '🚇';
  if (mode === 'bus') return '🚌';
  if (mode === 'mixed') return '🚍';
  return fallback;
}
function displayLabelOf(mode: PathMode, kind: 'main' | 'alt', fallback: string): string {
  if (mode === 'subway') return kind === 'main' ? '지하철 최단' : '지하철로 가면';
  if (mode === 'bus') return kind === 'main' ? '버스 최단' : '버스로 가면';
  if (mode === 'mixed') return kind === 'main' ? '대중교통 최단' : '다른 경로';
  return fallback;
}

// V1 미니 지하철도형 — 진짜 지하철 노선도처럼 점(역) + 가로선(노선) + 역명(아래).
//
// 보조 카드(좁은 너비)에서도 가독성 유지하려 compact 모드 지원:
//   - 점/선/칩 모두 한 단계 작게
//   - 노선칩은 약어("3", "BD") 사용 — 풀네임("3호선") 대신
//   - 역명 잘리지 않게 break-keep + 짧은 fixed 폭
const FALLBACK_LINE_COLOR = '#94A3B8';

// 버스 권역색 휴리스틱 (BusChip과 동일 로직)
function busColorOf(busNote: string | undefined): string {
  if (!busNote) return FALLBACK_LINE_COLOR;
  const m = busNote.match(/^(\S+?)번/);
  const num = parseInt(m?.[1] ?? '', 10);
  if (isNaN(num)) return '#3D5BA9';
  if (num >= 9000) return '#E60012';
  if (num >= 1000) return '#3CB44C';
  return '#3D5BA9';
}

// 역명에서 끝의 "역" 떼기 — 점이 이미 역임을 시각적으로 표현.
// "광화문역" → "광화문". "건대입구역" → "건대입구".
function trimStation(name: string): string {
  return name.replace(/역$/, '');
}

function SubwayPathDisplay({
  path,
  compact = false,
}: {
  path: SubwayHop[];
  compact?: boolean;
}) {
  const dotSize = compact ? 'h-3 w-3 border-[2px]' : 'h-4 w-4 border-[2.5px]';
  const lineH = compact ? 'h-[3px]' : 'h-1';
  const nameSize = compact ? 'text-[10px]' : 'text-[11px]';
  const stationW = compact ? 'w-12' : 'w-16';
  const lineTopPad = compact ? 'pt-1' : 'pt-1.5';
  const margin = compact ? 'mt-3' : 'mt-4';

  return (
    <div className={`${margin} flex items-start`}>
      {path.map((hop, i) => {
        const isLast = i === path.length - 1;
        const ridingLine = !isLast ? hop.rideLine : undefined;
        const ridingBus = !isLast && !hop.rideLine ? hop.note : undefined;
        const segColor: string = ridingLine
          ? LINE_COLOR[ridingLine].bg
          : ridingBus
          ? busColorOf(ridingBus)
          : FALLBACK_LINE_COLOR;

        const prevLine = i > 0 ? path[i - 1].rideLine : undefined;
        const prevBus = i > 0 && !path[i - 1].rideLine ? path[i - 1].note : undefined;
        const dotColor: string = hop.rideLine
          ? LINE_COLOR[hop.rideLine].bg
          : prevLine
          ? LINE_COLOR[prevLine].bg
          : prevBus
          ? busColorOf(prevBus)
          : FALLBACK_LINE_COLOR;

        return (
          <div key={i} className="contents">
            {/* 역(station) — 점 + 이름 (아래) */}
            <div className={`flex ${stationW} shrink-0 flex-col items-center`}>
              <span
                className={`${dotSize} shrink-0 rounded-full bg-white`}
                style={{ borderColor: dotColor }}
              />
              <span
                className={`mt-1 ${nameSize} font-bold leading-tight text-center break-keep text-foreground`}
              >
                {trimStation(hop.station)}
              </span>
            </div>
            {/* 연결선 + 노선칩 — 점 중심 라인에 맞추려 pt 살짝 */}
            {!isLast ? (
              <div className={`flex flex-1 items-center min-w-[20px] gap-0.5 ${lineTopPad}`}>
                <div className={`${lineH} flex-1 rounded-full`} style={{ background: segColor }} />
                {ridingLine ? (
                  <LineChip line={ridingLine} compact={compact} />
                ) : ridingBus ? (
                  <BusChip busNote={ridingBus} compact={compact} />
                ) : null}
                <div className={`${lineH} flex-1 rounded-full`} style={{ background: segColor }} />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

interface Props {
  apartmentId: string;
  district: string;
  regionCode?: string | null;
  commuteArea: CommuteArea | null | undefined;
  apartmentLat: number | null;
  apartmentLng: number | null;
  workplaceAddress?: string | null;
}

export default async function RouteOptions({
  apartmentId,
  district,
  regionCode,
  commuteArea,
  apartmentLat,
  apartmentLng,
  workplaceAddress,
}: Props) {
  const options = await generateRouteOptions({
    district,
    regionCode,
    commuteArea,
    apartmentLat,
    apartmentLng,
    workplaceAddress,
  });

  if (options.length === 0) {
    return null;
  }

  // ODSay 실시간 경로 — 단지 좌표 + 출근지 좌표가 모두 있을 때만 시도.
  // 실패·키 없음·캐시 미스 시 ODSay 호출 없이 하드코딩 매트릭스(subwayPath) 사용.
  let livePath: Awaited<ReturnType<typeof getTransitPath>> | null = null;
  if (
    apartmentLat !== null &&
    apartmentLng !== null &&
    commuteArea &&
    commuteArea !== 'none' &&
    commuteArea !== 'etc'
  ) {
    const dest = CBD_COORDS[commuteArea];
    if (dest) {
      livePath = await getTransitPath(
        apartmentId,
        { lat: apartmentLat, lng: apartmentLng },
        commuteArea,
        dest
      );
    }
  }

  const targetLabel =
    workplaceAddress && workplaceAddress.trim().length > 0
      ? workplaceAddress
      : commuteArea && commuteArea !== 'none' && commuteArea !== 'etc'
      ? `${COMMUTE_LABELS[commuteArea]} 방면`
      : '출근지';

  return (
    <div className="rounded-3xl border-2 border-primary/40 bg-primary-soft p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
          <MapPin className="h-3 w-3" />
          MY ROUTE
        </span>
        <span className="text-xs font-semibold text-foreground-sub">
          내 출근지까지
        </span>
      </div>
      <div className="mt-3 text-lg font-extrabold leading-snug text-foreground break-keep">
        {targetLabel}
      </div>

      {(() => {
        const subway = options.find((o) => o.mode === 'subway_fastest');
        const others = options.filter((o) => o.mode !== 'subway_fastest');

        // ── livePath / alternatives 모드 판별 (메인 카드 + 보조 카드 공통 사용) ──
        const useLive = livePath && livePath.hops.length >= 2;
        const liveHops = useLive ? livePath!.hops : [];
        const primaryMode = pathModeOf(liveHops);
        // 메인과 반대 모드 alternative 찾기 (사용자가 "다른 수단으로는?" 비교용)
        const altWanted: PathMode | null =
          primaryMode === 'subway' ? 'bus' :
          primaryMode === 'bus' ? 'subway' :
          primaryMode === 'mixed' ? 'subway' : // 혼합 메인이면 보조로 순수 지하철 시도
          null;
        const altPath = useLive && altWanted
          ? livePath!.alternatives.find((a) => pathModeOf(a.hops) === altWanted)
          : null;

        return (
          <>
            {/* 대중교통 최단 — 단독 피처 카드. ODSay livePath 있으면 우선 사용. */}
            {subway ? (() => {
              const displayPath = useLive ? liveHops : subway.subwayPath;
              const displayIcon = displayIconOf(primaryMode, subway.icon);
              const displayLabel = displayLabelOf(primaryMode, 'main', subway.label);
              const displayDuration = useLive
                ? `${livePath!.totalTimeMin}분 (도보 포함)`
                : subway.durationText;
              const displayTransfers = useLive
                ? livePath!.transitCount === 0
                  ? '직결'
                  : `환승 ${livePath!.transitCount}회`
                : subway.transfersText;
              return (
                <div className="mt-5 rounded-2xl border border-border bg-surface p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-lg">{displayIcon}</span>
                    <span className="text-[11px] font-semibold text-foreground-sub">
                      {displayLabel}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-1.5 text-base font-extrabold text-foreground">
                    <Clock className="h-3.5 w-3.5 text-foreground-sub" />
                    <span className="report-highlight">{displayDuration}</span>
                    <span className="ml-2 text-[11px] font-normal text-foreground-sub">
                      · {displayTransfers}
                    </span>
                  </div>
                  {useLive && livePath!.walkToFirstMin > 0 ? (
                    <div className="mt-1 text-[11px] text-foreground-sub">
                      단지 → {livePath!.firstStation} 도보 {livePath!.walkToFirstMin}분 포함
                    </div>
                  ) : null}
                  {displayPath && displayPath.length >= 2 ? (
                    <SubwayPathDisplay path={displayPath} />
                  ) : (
                    <div className="mt-2 text-[11px] leading-relaxed text-foreground-sub">
                      {subway.description}
                    </div>
                  )}
                </div>
              );
            })() : null}

            {/* 보조 카드 + 자차 — 2-col 그리드.
                ODSay alternative가 있으면 좌하단을 "다른 수단" 카드로 교체. */}
            {others.length > 0 ? (
              <div className="mt-3 grid auto-rows-fr gap-3 break-keep sm:grid-cols-2">
                {others.map((opt) => {
                  // subway_simple 자리를 ODSay alternative로 교체 (있으면)
                  if (opt.mode === 'subway_simple' && altPath) {
                    const altMode = pathModeOf(altPath.hops);
                    return (
                      <div
                        key={opt.mode}
                        className="flex flex-col rounded-2xl border border-border bg-surface p-4 shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-lg">{displayIconOf(altMode, '🚇')}</span>
                          <span className="text-[11px] font-semibold text-foreground-sub">
                            {displayLabelOf(altMode, 'alt', '환승 적게')}
                          </span>
                        </div>
                        <div className="mt-3 flex items-center gap-1.5 text-base font-extrabold text-foreground">
                          <Clock className="h-3.5 w-3.5 text-foreground-sub" />
                          <span className="report-highlight">{altPath.totalTimeMin}분</span>
                          <span className="ml-2 text-[11px] font-normal text-foreground-sub">
                            · {altPath.transitCount === 0 ? '직결' : `환승 ${altPath.transitCount}회`}
                          </span>
                        </div>
                        {altPath.walkToFirstMin > 0 ? (
                          <div className="mt-1 text-[11px] text-foreground-sub">
                            단지 → {altPath.firstStation} 도보 {altPath.walkToFirstMin}분 포함
                          </div>
                        ) : null}
                        {altPath.hops.length >= 2 ? (
                          <SubwayPathDisplay path={altPath.hops} compact />
                        ) : null}
                      </div>
                    );
                  }
                  return (
                  <div
                    key={opt.mode}
                    className="flex flex-col rounded-2xl border border-border bg-surface p-4 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-lg">{opt.icon}</span>
                      <span className="text-[11px] font-semibold text-foreground-sub">
                        {opt.label}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center gap-1.5 text-base font-extrabold text-foreground">
                      <Clock className="h-3.5 w-3.5 text-foreground-sub" />
                      <span className="report-highlight">{opt.durationText}</span>
                    </div>
                    <div className="mt-1 text-[11px] text-foreground-sub">
                      {opt.transfersText}
                    </div>
                    <div className="mt-2 text-[11px] leading-relaxed text-foreground-sub">
                      {opt.description}
                    </div>
                    {opt.note ? (
                      <div className="mt-2 flex items-start gap-1 text-[10px] text-foreground-sub/80">
                        <Info className="h-3 w-3 shrink-0" />
                        {opt.note}
                      </div>
                    ) : null}
                  </div>
                  );
                })}
              </div>
            ) : null}
          </>
        );
      })()}

      <p className="mt-4 text-[11px] text-foreground-sub">
        ※ 참고 수치예요. 실제 시간대·환승 대기·도로 상황에 따라 달라질 수 있어요.
      </p>
    </div>
  );
}
