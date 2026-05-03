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

// V1 미니 지하철도형 — 두 가지 변형 (둘 다 가로 노선도 톤):
//
// SubwayPathDisplay (메인 카드 / 너비 충분):
//   점(h-4) + 이름(아래, text-[11px]) + 가로선(h-1) + 노선칩 풀라벨("3호선")
//
// SubwayPathDisplayCompact (보조 alt 카드 / 좁은 너비):
//   점(h-3) + 이름(아래, text-[10px]) + 가로선(h-[3px]) + 노선칩 약어("3")
//
// 핵심 정렬: 연결선·노선칩 컨테이너 height = 점 높이 → items-center로
//   라인·칩 모두 점 중심 y와 정확히 일치.
const FALLBACK_LINE_COLOR = '#94A3B8';

// 버스 권역색 휴리스틱
function busColorOf(busNote: string | undefined): string {
  if (!busNote) return FALLBACK_LINE_COLOR;
  const m = busNote.match(/^(\S+?)번/);
  const num = parseInt(m?.[1] ?? '', 10);
  if (isNaN(num)) return '#3D5BA9';
  if (num >= 9000) return '#E60012';
  if (num >= 1000) return '#3CB44C';
  return '#3D5BA9';
}

// 역명에서 끝의 "역" 제거 (점이 이미 역 표시)
function trimStation(name: string): string {
  return name.replace(/역$/, '');
}

interface DisplayProps {
  path: SubwayHop[];
}

// ─── 공통 빌더 ───
// 단일 함수로 main/compact 둘 다 처리 — 사이즈 토큰만 다름.
function buildSubwayDisplay(
  path: SubwayHop[],
  size: {
    dot: string;       // ex 'h-4 w-4 border-[2.5px]'
    dotPx: number;     // dot height in px (line/chip 컨테이너 정렬용)
    line: string;      // ex 'h-1'
    name: string;      // text size
    stationW: string;  // 역 블록 width
    nameMt: string;    // 점과 이름 사이 간격
    minConn: string;   // connector min width
    chipCompact: boolean; // LineChip/BusChip compact 여부
    gap: string;       // connector 내부 gap
    margin: string;    // 컨테이너 mt
  }
) {
  return (
    <div className={`${size.margin} flex items-start`}>
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
            {/* 역 — 점 + 이름(아래) */}
            <div className={`flex ${size.stationW} shrink-0 flex-col items-center`}>
              <span
                className={`${size.dot} shrink-0 rounded-full bg-white`}
                style={{ borderColor: dotColor }}
              />
              <span
                className={`${size.nameMt} ${size.name} font-bold leading-tight text-center break-keep text-foreground`}
              >
                {trimStation(hop.station)}
              </span>
            </div>
            {/* 연결자 — 컨테이너 높이를 점 높이와 동일하게 잡고 items-center로
                라인·칩의 vertical center를 점 center에 정확 정렬. */}
            {!isLast ? (
              <div
                className={`flex flex-1 ${size.minConn} ${size.gap} items-center`}
                style={{ height: `${size.dotPx}px` }}
              >
                <div className={`${size.line} flex-1 rounded-full`} style={{ background: segColor }} />
                {ridingLine ? (
                  <LineChip line={ridingLine} compact={size.chipCompact} />
                ) : ridingBus ? (
                  <BusChip busNote={ridingBus} compact={size.chipCompact} />
                ) : null}
                <div className={`${size.line} flex-1 rounded-full`} style={{ background: segColor }} />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

// ─── 메인 카드용 (큰 사이즈) ───
function SubwayPathDisplay({ path }: DisplayProps) {
  return buildSubwayDisplay(path, {
    dot: 'h-4 w-4 border-[2.5px]',
    dotPx: 16,
    line: 'h-1',
    name: 'text-[11px]',
    stationW: 'w-16',
    nameMt: 'mt-1.5',
    minConn: 'min-w-[28px]',
    chipCompact: false,
    gap: 'gap-1',
    margin: 'mt-4',
  });
}

// ─── 보조 alt 카드용 (작은 사이즈, 노선칩 약어) ───
function SubwayPathDisplayCompact({ path }: DisplayProps) {
  return buildSubwayDisplay(path, {
    dot: 'h-3 w-3 border-[2px]',
    dotPx: 12,
    line: 'h-[3px]',
    name: 'text-[10px]',
    stationW: 'w-12',
    nameMt: 'mt-1',
    minConn: 'min-w-[20px]',
    chipCompact: true,
    gap: 'gap-0.5',
    margin: 'mt-3',
  });
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
                          <SubwayPathDisplayCompact path={altPath.hops} />
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
        ※ 평일 일반 시간대 기준 추정치예요. 출퇴근 시간대(7~9시)는 환승 대기·열차 혼잡으로 더 길어질 수 있어요.
      </p>
    </div>
  );
}
