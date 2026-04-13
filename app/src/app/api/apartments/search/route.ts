import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim() ?? '';

  if (q.length < 1) {
    return NextResponse.json({ items: [] });
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('apartments')
    .select('id, name, address, total_units, built_year, nearest_station, station_distance_m')
    .ilike('name', `%${q}%`)
    .limit(10);

  if (error) {
    return NextResponse.json({ error: 'DB_ERROR' }, { status: 500 });
  }

  return NextResponse.json({
    items: (data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      address: row.address,
      totalUnits: row.total_units,
      builtYear: row.built_year,
      nearestStation: row.nearest_station,
      stationDistanceM: row.station_distance_m,
    })),
  });
}
