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

// 호선 칩 — 서울 지하철 공식 컬러 + 풀네임 라벨
function LineChip({ line }: { line: LineCode }) {
  const c = LINE_COLOR[line];
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-md px-2 py-0.5 text-[10px] font-bold leading-tight whitespace-nowrap"
      style={{ background: c.bg, color: c.fg }}
    >
      {LINE_FULL_LABEL[line]}
    </span>
  );
}

// 버스 칩 — 서울 시내버스 권역색 (간선 파랑 / 지선 초록 / 광역 빨강 / 마을 노랑)
// 정확한 분류는 ODSay type 코드로 가능하지만, 단순화: busNo 기준 휴리스틱.
function BusChip({ busNote }: { busNote: string }) {
  const m = busNote.match(/^(\S+?)번/);
  const label = m ? `${m[1]}번` : busNote.split('·')[0].trim();
  // 권역색 휴리스틱 — 첫 숫자 기준 (서울 버스 번호 체계)
  // 100~999 = 간선(파랑), 4자리 = 지선(초록), 9000번대/광역 = 빨강
  const num = parseInt(m?.[1] ?? '', 10);
  let bg = '#3D5BA9'; // 기본: 간선 파랑
  if (!isNaN(num)) {
    if (num >= 9000) bg = '#E60012';      // 광역
    else if (num >= 1000) bg = '#3CB44C'; // 지선
    else bg = '#3D5BA9';                  // 간선
  }
  return (
    <span
      className="inline-flex min-w-[36px] shrink-0 items-center justify-center rounded-md px-1.5 py-0.5 text-[10px] font-bold leading-tight"
      style={{ background: bg, color: '#FFFFFF' }}
    >
      {label}
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

// 새 단순 디자인 — 각 row 좌측에 노선/버스 컬러칩 + 역명 + 우측에 역할 라벨(탑승/환승/하차).
// 환승은 row 사이 노선 칩이 바뀜으로 자연스럽게 표현. 도착 row는 직전 이동 수단으로.
const ROLE_LABEL = { board: '탑승', transfer: '환승', arrive: '하차' } as const;
const ROLE_TONE = {
  board: 'bg-primary-soft text-primary-ink',
  transfer: 'bg-warning-soft text-warning',
  arrive: 'bg-success-soft text-success',
} as const;

function SubwayPathDisplay({ path }: { path: SubwayHop[] }) {
  return (
    <ol className="mt-3 flex flex-col gap-1.5">
      {path.map((hop, i) => {
        // 이 row의 칩 결정: 자기 hop이 탑승/환승이면 자기 rideLine·busNote, 도착이면 직전 hop의 거.
        const refHop = hop.rideLine || hop.note ? hop : path[i - 1] ?? hop;
        const lineCode = refHop.rideLine;
        const busNote = !lineCode ? refHop.note : undefined;

        return (
          <li key={i} className="flex items-center gap-2 text-[13px]">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
              {i + 1}
            </span>
            {lineCode ? <LineChip line={lineCode} /> : null}
            {!lineCode && busNote ? <BusChip busNote={busNote} /> : null}
            <span className="flex-1 truncate font-semibold text-foreground">{hop.station}</span>
            <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-bold ${ROLE_TONE[hop.role]}`}>
              {ROLE_LABEL[hop.role]}
            </span>
          </li>
        );
      })}
    </ol>
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
                          <SubwayPathDisplay path={altPath.hops} />
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
