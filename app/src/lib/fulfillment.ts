// 결제 이행 (fulfillment) — 리포트 생성 + payment 상태 승인 처리
// 정상 플로우(토스 승인 후)와 테스트 바이패스(prepare에서 즉시) 모두에서 재사용.

import { createSupabaseAdminClient } from './supabase/server';
import { generateCompareReport } from './claude';
import { buildMockCompareReport } from './mock-reports';
import { loadProfile } from './profile';
import { PRODUCT_NAMES, type ProductId } from './pricing';
import type { ApartmentWithLatestPrice, TradePoint } from '@/types/apartment';

export interface PendingPaymentRow {
  order_id: string;
  phone: string;
  product_id: string;
  apartment_ids: string[];
  user_conditions: Record<string, unknown> | null;
  amount: number;
  report_id: string | null;
  status: string;
}

export interface FulfillmentMeta {
  paymentKey?: string | null;
  method?: string | null;
  approvedAt?: string | null;
}

export type FulfillmentResult =
  | { ok: true; reportId: string }
  | { ok: false; error: string; status: number };

export async function fulfillPendingPayment(
  pending: PendingPaymentRow,
  meta: FulfillmentMeta = {}
): Promise<FulfillmentResult> {
  const supabase = createSupabaseAdminClient();
  const productId = pending.product_id as ProductId;
  const apartmentIds = pending.apartment_ids;

  // 1) 단지 데이터 + 단지별 최근 24건 실거래가 로드 (시세 흐름 비교용)
  const { data: aptRows } = await supabase
    .from('apartments')
    .select('*')
    .in('id', apartmentIds);

  const tradesByApt = new Map<string, TradePoint[]>();
  if (aptRows && aptRows.length > 0) {
    const { data: trades } = await supabase
      .from('trade_history')
      .select('apartment_id, price_10k, area_m2, deal_date, floor, deal_type')
      .in('apartment_id', apartmentIds)
      .order('deal_date', { ascending: false });
    for (const t of trades ?? []) {
      const list = tradesByApt.get(t.apartment_id);
      const point = {
        dealDate: t.deal_date,
        priceM10k: t.price_10k,
        areaM2: t.area_m2,
        floor: t.floor ?? undefined,
        dealType: (t as { deal_type?: string | null }).deal_type ?? null,
      };
      // 단지당 24건까지만 보관 (이미 desc 정렬이라 앞 24건이 최근)
      if (!list) {
        tradesByApt.set(t.apartment_id, [point]);
      } else if (list.length < 24) {
        list.push(point);
      }
    }
  }

  const apartments: ApartmentWithLatestPrice[] = (aptRows ?? []).map((row) => {
    const trades = tradesByApt.get(row.id) ?? [];
    const latest = trades[0]; // desc 정렬 → 최신
    return {
      id: row.id,
      name: row.name,
      address: row.address,
      totalUnits: row.total_units,
      builtYear: row.built_year,
      nearestStation: row.nearest_station,
      stationDistanceM: row.station_distance_m,
      latitude: row.latitude,
      longitude: row.longitude,
      latestPrice10k: latest?.priceM10k,
      latestDealDate: latest?.dealDate,
      latestAreaM2: latest?.areaM2,
      trades,
    };
  });

  // 1.5) 비교 리포트 개인화: 사용자 프로필 로드 (실패해도 진행)
  let profile = null;
  if (productId === 'compare_report') {
    try {
      profile = await loadProfile(pending.phone);
    } catch {
      profile = null;
    }
  }

  // 2) 리포트 마크다운 생성 (상품별 분기)
  let markdown: string;
  try {
    if (productId === 'compare_report') {
      if (process.env.NODE_ENV === 'development' && !process.env.ANTHROPIC_API_KEY) {
        markdown = buildMockCompareReport(apartments, profile);
      } else {
        markdown = await generateCompareReport(apartments, profile);
      }
    } else {
      markdown = `# ${PRODUCT_NAMES[productId]}\n\n곧 제공될 예정이에요. 조금만 기다려주세요.`;
    }
  } catch (err) {
    return {
      ok: false,
      error: `AI_GENERATION_FAILED: ${(err as Error).message}`,
      status: 502,
    };
  }

  // 3) 리포트 저장
  const title =
    productId === 'compare_report'
      ? `${apartments.map((a) => a.name).join(' vs ')} 나란히 보기`
      : `${PRODUCT_NAMES[productId]} · ${apartments[0]?.name ?? ''}`;

  const { data: report, error: reportError } = await supabase
    .from('reports')
    .insert({
      phone: pending.phone,
      report_type: productId,
      title,
      apartment_ids: apartmentIds,
      user_conditions: pending.user_conditions,
      content: {
        markdown,
        apartmentName: apartments.map((a) => a.name).join(' vs '),
        apartments: apartments.map((a) => ({
          id: a.id,
          name: a.name,
          address: a.address,
          latitude: a.latitude ?? null,
          longitude: a.longitude ?? null,
          nearestStation: a.nearestStation ?? null,
          stationDistanceM: a.stationDistanceM ?? null,
          totalUnits: a.totalUnits ?? null,
          builtYear: a.builtYear ?? null,
          latestPrice10k: a.latestPrice10k ?? null,
          latestAreaM2: a.latestAreaM2 ?? null,
          trades: a.trades ?? [],
        })),
        generatedAt: new Date().toISOString(),
      },
      price: pending.amount,
      status: 'generated',
    })
    .select('id')
    .single();

  if (reportError || !report) {
    return {
      ok: false,
      error: reportError?.message ?? 'REPORT_CREATE_FAILED',
      status: 500,
    };
  }

  // 4) 결제 승인 처리
  await supabase
    .from('payments')
    .update({
      status: 'approved',
      payment_key: meta.paymentKey ?? null,
      method: meta.method ?? 'TEST_BYPASS',
      approved_at: meta.approvedAt ?? new Date().toISOString(),
      report_id: report.id,
    })
    .eq('order_id', pending.order_id);

  return { ok: true, reportId: report.id };
}
