import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/session';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { checkFreeQuota, consumeFreeQuota } from '@/lib/quota';
import { generateFreeDeepSingleReport } from '@/lib/claude';
import { loadProfile } from '@/lib/profile';
import { calcJeonseRatio, type RentPoint } from '@/lib/jeonse-ratio';
import { calcRegionPercentile } from '@/lib/region-stats';
import { fetchCompareSuggestions } from '@/lib/compare-suggestions';
import { calcPricePerPyeong } from '@/lib/utils';
import type { ApartmentWithLatestPrice } from '@/types/apartment';
import type { UserProfile } from '@/types/profile';
import { buildMockFreeReport, buildMockTldr } from '@/lib/mock-reports';

const schema = z.object({
  apartmentId: z.string().uuid(),
  profile: z
    .object({
      householdType: z.string(),
      priorities: z.array(z.string()),
      commuteArea: z.string().optional(),
      workplaceAddress: z.string().optional(),
    })
    .optional(),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 });
  }

  const { apartmentId, profile: profileOverride } = parsed.data;

  const quota = await checkFreeQuota(session.phone);
  if (!quota.hasQuota) {
    // 이미 이 단지로 받은 무료 리포트가 있다면 링크 제공
    const supabase = createSupabaseAdminClient();
    const { data: existing } = await supabase
      .from('reports')
      .select('id')
      .eq('phone', session.phone)
      .eq('report_type', 'free_deep_single')
      .contains('apartment_ids', [apartmentId])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return NextResponse.json(
      {
        error: 'QUOTA_EXHAUSTED',
        message: '이미 무료 분석을 받으셨어요',
        existingReportId: existing?.id ?? null,
        upsell: { productId: 'compare_report', price: 990 },
      },
      { status: 402 }
    );
  }

  const supabase = createSupabaseAdminClient();

  const { data: aptRow, error: aptError } = await supabase
    .from('apartments')
    .select('*')
    .eq('id', apartmentId)
    .maybeSingle();

  if (aptError || !aptRow) {
    return NextResponse.json({ error: 'APARTMENT_NOT_FOUND' }, { status: 404 });
  }

  const { data: tradeRows } = await supabase
    .from('trade_history')
    .select('price_10k, deal_date, area_m2, floor, deal_type')
    .eq('apartment_id', apartmentId)
    .order('deal_date', { ascending: false })
    .limit(24);

  const trades = (tradeRows ?? []).map((t) => ({
    dealDate: t.deal_date,
    priceM10k: t.price_10k,
    areaM2: t.area_m2,
    floor: t.floor ?? undefined,
    dealType: (t as { deal_type?: string | null }).deal_type ?? null,
  }));

  // 전세가율 계산용 전월세 거래 (최근 60건)
  const { data: rentRows } = await supabase
    .from('rent_history')
    .select('deposit_10k, monthly_rent_10k, area_m2, deal_date, contract_type, deal_type')
    .eq('apartment_id', apartmentId)
    .order('deal_date', { ascending: false })
    .limit(60);

  const rents: RentPoint[] = (rentRows ?? []).map((r) => ({
    dealDate: r.deal_date,
    depositM10k: r.deposit_10k,
    monthlyRentM10k: r.monthly_rent_10k ?? 0,
    areaM2: r.area_m2,
    contractType: (r.contract_type ?? null) as RentPoint['contractType'],
    dealType: (r as { deal_type?: string | null }).deal_type ?? null,
  }));

  const jeonseRatio = calcJeonseRatio(trades, rents);
  const regionPercentile = await calcRegionPercentile(
    apartmentId,
    aptRow.dong_code ?? null,
    trades
  ).catch(() => null);

  // 비교 추천 단지 (현 단지의 평당가 평균을 기준으로)
  const myMarketTrades = trades.filter((t) => t.dealType !== '직거래');
  const myAvgPpy =
    myMarketTrades.length > 0
      ? Math.round(
          myMarketTrades.reduce((s, t) => s + calcPricePerPyeong(t.priceM10k, t.areaM2), 0) /
            myMarketTrades.length
        )
      : 0;
  const compareSuggestions = myAvgPpy > 0
    ? await fetchCompareSuggestions(apartmentId, aptRow.dong_code ?? null, myAvgPpy).catch(() => [])
    : [];

  const latest = trades[0];

  const apartment: ApartmentWithLatestPrice = {
    id: aptRow.id,
    name: aptRow.name,
    address: aptRow.address,
    totalUnits: aptRow.total_units,
    builtYear: aptRow.built_year,
    nearestStation: aptRow.nearest_station,
    stationDistanceM: aptRow.station_distance_m,
    latitude: aptRow.latitude,
    longitude: aptRow.longitude,
    latestPrice10k: latest?.priceM10k,
    latestDealDate: latest?.dealDate,
    latestAreaM2: latest?.areaM2,
    trades,
  };

  // 프로필 로드: API 요청에서 직접 받았거나, DB에서 조회
  let profile: UserProfile | null = null;
  if (profileOverride) {
    profile = {
      phone: session.phone,
      householdType: profileOverride.householdType as UserProfile['householdType'],
      priorities: profileOverride.priorities as UserProfile['priorities'],
      commuteArea: profileOverride.commuteArea as UserProfile['commuteArea'],
      workplaceAddress: profileOverride.workplaceAddress,
    };
  } else {
    try {
      profile = await loadProfile(session.phone);
    } catch {
      profile = null;
    }
  }

  let markdown: string;
  try {
    if (process.env.NODE_ENV === 'development' && !process.env.ANTHROPIC_API_KEY) {
      markdown = buildMockFreeReport(apartment, profile);
    } else {
      markdown = await generateFreeDeepSingleReport(apartment, profile);
    }
  } catch (err) {
    return NextResponse.json(
      { error: 'AI_GENERATION_FAILED', message: (err as Error).message },
      { status: 502 }
    );
  }

  // TL;DR — mock builder는 결정론적이라 항상 생성. Claude API 모드에서도 mock으로 보조 가능.
  const tldr = buildMockTldr(apartment, profile);

  const { data: report, error: reportError } = await supabase
    .from('reports')
    .insert({
      phone: session.phone,
      report_type: 'free_deep_single',
      title: `${apartment.name} 단지 심층 분석`,
      apartment_ids: [apartmentId],
      user_conditions: profile
        ? {
            householdType: profile.householdType,
            priorities: profile.priorities,
            commuteArea: profile.commuteArea,
            workplaceAddress: profile.workplaceAddress,
          }
        : null,
      content: {
        markdown,
        tldr,
        compareSuggestions,
        trades: apartment.trades ?? [],
        apartmentName: apartment.name,
        apartments: [
          {
            id: apartment.id,
            name: apartment.name,
            address: apartment.address,
            latitude: apartment.latitude ?? null,
            longitude: apartment.longitude ?? null,
            nearestStation: apartment.nearestStation ?? null,
            stationDistanceM: apartment.stationDistanceM ?? null,
            totalUnits: apartment.totalUnits ?? null,
            builtYear: apartment.builtYear ?? null,
            jeonseRatio, // null 또는 { ratio, pct, saleAvg10k, jeonseAvg10k, ... }
            regionPercentile, // null 또는 { scope, regionAvg, diffPct, ... }
          },
        ],
        generatedAt: new Date().toISOString(),
      },
      price: 0,
      status: 'generated',
    })
    .select('id')
    .single();

  if (reportError || !report) {
    return NextResponse.json({ error: 'DB_ERROR' }, { status: 500 });
  }

  await consumeFreeQuota(session.phone, apartmentId);

  return NextResponse.json({ ok: true, reportId: report.id });
}
