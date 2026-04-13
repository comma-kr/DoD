import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const supabase = createSupabaseAdminClient();

  const { data: apt, error } = await supabase
    .from('apartments')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error || !apt) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  }

  const { data: trades } = await supabase
    .from('trade_history')
    .select('deal_date, area_m2, price_10k, floor')
    .eq('apartment_id', id)
    .order('deal_date', { ascending: false })
    .limit(5);

  return NextResponse.json({
    apartment: {
      id: apt.id,
      name: apt.name,
      address: apt.address,
      totalUnits: apt.total_units,
      builtYear: apt.built_year,
      nearestStation: apt.nearest_station,
      stationDistanceM: apt.station_distance_m,
      latitude: apt.latitude,
      longitude: apt.longitude,
    },
    recentTrades: trades ?? [],
  });
}
