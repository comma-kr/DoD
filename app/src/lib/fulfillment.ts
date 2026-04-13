// 결제 이행 (fulfillment) — 리포트 생성 + payment 상태 승인 처리
// 정상 플로우(토스 승인 후)와 테스트 바이패스(prepare에서 즉시) 모두에서 재사용.

import { createSupabaseAdminClient } from './supabase/server';
import { generateCompareReport } from './claude';
import { buildMockCompareReport } from './mock-reports';
import { PRODUCT_NAMES, type ProductId } from './pricing';
import type { ApartmentWithLatestPrice } from '@/types/apartment';

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

  // 1) 단지 데이터 + 최근 실거래가 로드
  const { data: aptRows } = await supabase
    .from('apartments')
    .select('*')
    .in('id', apartmentIds);

  const latestTradesByApt = new Map<string, { priceM10k: number; areaM2: number }>();
  if (aptRows && aptRows.length > 0) {
    const { data: trades } = await supabase
      .from('trade_history')
      .select('apartment_id, price_10k, area_m2, deal_date')
      .in('apartment_id', apartmentIds)
      .order('deal_date', { ascending: false });
    for (const t of trades ?? []) {
      if (!latestTradesByApt.has(t.apartment_id)) {
        latestTradesByApt.set(t.apartment_id, {
          priceM10k: t.price_10k,
          areaM2: t.area_m2,
        });
      }
    }
  }

  const apartments: ApartmentWithLatestPrice[] = (aptRows ?? []).map((row) => {
    const latest = latestTradesByApt.get(row.id);
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
      latestAreaM2: latest?.areaM2,
    };
  });

  // 2) 리포트 마크다운 생성 (상품별 분기)
  let markdown: string;
  try {
    if (productId === 'compare_report') {
      if (process.env.NODE_ENV === 'development' && !process.env.ANTHROPIC_API_KEY) {
        markdown = buildMockCompareReport(apartments);
      } else {
        markdown = await generateCompareReport(apartments);
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
