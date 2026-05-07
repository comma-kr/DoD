import Link from 'next/link';
import { FileText, Lock, MapPin, Train, UserCog } from 'lucide-react';
import { getSession } from '@/lib/session';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { loadProfile } from '@/lib/profile';
import { formatDate, formatPrice, maskKoreanPhone } from '@/lib/utils';
import { checkStation } from '@/lib/station-display';
import { PRODUCT_NAMES, type ProductId } from '@/lib/pricing';
import { HOUSEHOLD_LABELS, HOUSEHOLD_EMOJIS } from '@/types/profile';
import LogoutButton from '@/components/layout/LogoutButton';

export default async function MyPage() {
  const session = await getSession();

  if (!session) {
    return (
      <main className="flex flex-1 items-center justify-center px-6">
        <div className="w-full max-w-md rounded-3xl border border-border bg-surface p-10 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-surface text-foreground-sub">
            <Lock className="h-5 w-5" />
          </div>
          <h1 className="mt-6 text-xl font-bold">보관함 열려면 인증부터</h1>
          <p className="mt-2 text-sm text-foreground-sub">
            번호 인증만 하면 그동안 펼쳤던 단지를 다시 보실 수 있어요.
          </p>
          <Link
            href="/analyze"
            className="mt-6 inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white"
          >
            펼쳐보기 시작
          </Link>
        </div>
      </main>
    );
  }

  const supabase = createSupabaseAdminClient();
  const { data: reports } = await supabase
    .from('reports')
    .select('id, title, report_type, price, created_at')
    .eq('phone', session.phone)
    .order('created_at', { ascending: false });

  let profile = null;
  try {
    profile = await loadProfile(session.phone);
  } catch {
    profile = null;
  }

  const maskedPhone = maskKoreanPhone(session.phone);

  // 빈 보관함일 때 노출할 인기 단지 픽 (재방문 유도).
  // 1순위: 최근 30일 reports.apartment_ids 카운트. 2순위: totalUnits 큰 단지 fallback.
  let popularApartments: Array<{
    id: string;
    name: string;
    address: string;
    totalUnits: number | null;
    nearestStation: string | null;
    stationDistanceM: number | null;
  }> = [];
  const hasReports = reports && reports.length > 0;
  if (!hasReports) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    const { data: recentReports } = await supabase
      .from('reports')
      .select('apartment_ids')
      .gte('created_at', thirtyDaysAgo)
      .limit(2000);
    const counter = new Map<string, number>();
    recentReports?.forEach((r) => {
      const ids = (r.apartment_ids ?? []) as string[];
      ids.forEach((id) => counter.set(id, (counter.get(id) ?? 0) + 1));
    });
    let topIds = [...counter.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id]) => id);
    if (topIds.length < 3) {
      const { data: fallback } = await supabase
        .from('apartments')
        .select('id')
        .not('latitude', 'is', null)
        .order('total_units', { ascending: false })
        .limit(6);
      topIds = [...new Set([...topIds, ...(fallback?.map((a) => a.id) ?? [])])].slice(0, 3);
    }
    if (topIds.length > 0) {
      const { data: apts } = await supabase
        .from('apartments')
        .select('id, name, address, total_units, nearest_station, station_distance_m')
        .in('id', topIds);
      // 점수순 정렬 유지
      popularApartments = topIds
        .map((id) => apts?.find((a) => a.id === id))
        .filter((a): a is NonNullable<typeof a> => Boolean(a))
        .map((a) => ({
          id: a.id,
          name: a.name,
          address: a.address,
          totalUnits: a.total_units ?? null,
          nearestStation: a.nearest_station ?? null,
          stationDistanceM: a.station_distance_m ?? null,
        }));
    }
  }

  return (
    <main className="flex-1">
      <section className="mx-auto max-w-3xl px-6 pt-16 pb-20">
        <header className="mb-10 flex items-start justify-between gap-4">
          <div>
            <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-warning-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-warning">
              MY · 보관함
            </span>
            <h1 className="text-3xl font-bold sm:text-4xl">
              지금까지 <em className="report-highlight not-italic">펼친 단지</em>
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-foreground-sub">
              {maskedPhone} 번호로 칠래말래? 펼쳐본 단지들 모음이에요.
            </p>
          </div>
          <LogoutButton />
        </header>

        <Link
          href="/analyze/profile"
          className="mb-6 flex items-center gap-4 rounded-2xl border border-border bg-surface p-5 shadow-sm transition hover:border-primary/40"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary/15 text-secondary">
            <UserCog className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-foreground">
              {profile?.householdType
                ? `${HOUSEHOLD_EMOJIS[profile.householdType]} ${HOUSEHOLD_LABELS[profile.householdType]} 기준으로 설정됨`
                : '내 프로필 설정하기'}
            </div>
            <div className="text-xs text-foreground-sub">
              가족 형태와 우선순위를 바꾸면 리포트가 다시 쓰여요
            </div>
          </div>
          <span className="text-xs text-foreground-sub">수정 →</span>
        </Link>

        {!reports || reports.length === 0 ? (
          <div className="space-y-6">
            <div className="rounded-3xl border border-dashed border-border bg-surface/40 p-10 text-center text-sm text-foreground-sub">
              아직 펼친 단지가 없어요.
              <br />
              <Link href="/analyze" className="mt-4 inline-block font-semibold text-primary">
                한 장 펼쳐보기 →
              </Link>
            </div>

            {popularApartments.length > 0 ? (
              <section>
                <h2 className="text-sm font-bold text-foreground">
                  이런 단지도 펼쳐보고 있어요
                </h2>
                <p className="mt-1 text-xs text-foreground-sub">
                  요즘 사람들이 자주 까보는 단지들. 클릭하면 바로 분석 진입.
                </p>
                <ul className="mt-4 space-y-3">
                  {popularApartments.map((a) => {
                    const station = checkStation(a.nearestStation, a.stationDistanceM);
                    return (
                      <li key={a.id}>
                        <Link
                          href={`/analyze?aptId=${a.id}`}
                          className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm transition hover:border-primary/40 hover:shadow-md"
                        >
                          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-foreground-sub" />
                          <div className="flex-1">
                            <div className="font-semibold">{a.name}</div>
                            <div className="text-xs text-foreground-sub">
                              {a.address}
                              {a.totalUnits ? ` · ${a.totalUnits}세대` : ''}
                            </div>
                            {station.show ? (
                              <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-[11px] text-primary-ink">
                                <Train className="h-3 w-3" />
                                {station.displayName}
                                {station.distanceLabel ? ` · ${station.distanceLabel}` : ''}
                              </div>
                            ) : null}
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}
          </div>
        ) : (
          <ul className="space-y-3">
            {reports.map((r) => {
              const typeName = PRODUCT_NAMES[r.report_type as ProductId] ?? '리포트';
              return (
                <li key={r.id}>
                  <Link
                    href={`/report/${r.id}`}
                    className="flex items-start gap-4 rounded-2xl border border-border bg-surface p-5 shadow-sm transition hover:border-primary/40"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{r.title}</h3>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-foreground-sub">
                        <span className="rounded-full border border-border px-2 py-0.5">
                          {typeName}
                        </span>
                        <span>{formatDate(r.created_at)}</span>
                        <span>
                          {r.price === 0 ? '무료' : formatPrice(r.price)}
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
