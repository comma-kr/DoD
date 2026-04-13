// 사용자 프로필 로드/저장 헬퍼
// user_profiles 테이블이 아직 적용되지 않은 경우에도 앱이 동작하도록
// PostgREST 에러 코드 '42P01' (relation does not exist)를 캐치해 null로 반환한다.

import { createSupabaseAdminClient } from './supabase/server';
import type {
  UserProfile,
  HouseholdType,
  Priority,
  CommuteArea,
  TransportMode,
} from '@/types/profile';

type ProfileRow = {
  phone: string;
  household_type: HouseholdType;
  priorities: Priority[];
  commute_area: CommuteArea | null;
  commute_area_custom: string | null;
  workplace_address: string | null;
  transport_mode: TransportMode | null;
  updated_at: string;
};

function rowToProfile(row: ProfileRow): UserProfile {
  return {
    phone: row.phone,
    householdType: row.household_type,
    priorities: row.priorities ?? [],
    commuteArea: row.commute_area ?? undefined,
    commuteAreaCustom: row.commute_area_custom ?? undefined,
    workplaceAddress: row.workplace_address ?? undefined,
    transportMode: row.transport_mode ?? undefined,
    updatedAt: row.updated_at,
  };
}

function isMissingTable(error: { code?: string; message?: string }): boolean {
  return (
    error.code === '42P01' ||
    error.code === 'PGRST205' ||
    (error.message?.includes('user_profiles') &&
      error.message?.includes('does not exist')) ||
    error.message?.includes("Could not find the table") ||
    false
  );
}

function isMissingColumn(
  error: { code?: string; message?: string },
  column: string
): boolean {
  return (
    error.code === '42703' ||
    error.code === 'PGRST204' ||
    (error.message?.includes(column) && error.message?.includes('column')) ||
    error.message?.includes(`Could not find the '${column}' column`) ||
    false
  );
}

export async function loadProfile(
  phone: string
): Promise<UserProfile | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('phone', phone)
    .maybeSingle();

  if (error) {
    if (isMissingTable(error)) return null;
    throw new Error(`프로필 조회 실패: ${error.message}`);
  }

  if (!data) return null;
  // workplace_address 컬럼이 없을 수 있음 → null로 보정
  const row = data as Partial<ProfileRow> & {
    phone: string;
    household_type: ProfileRow['household_type'];
    priorities: ProfileRow['priorities'];
    updated_at: string;
  };
  return rowToProfile({
    ...row,
    commute_area: row.commute_area ?? null,
    commute_area_custom: row.commute_area_custom ?? null,
    workplace_address: row.workplace_address ?? null,
    transport_mode: row.transport_mode ?? null,
  });
}

export async function saveProfile(profile: {
  phone: string;
  householdType: HouseholdType;
  priorities: Priority[];
  commuteArea?: CommuteArea;
  commuteAreaCustom?: string;
  workplaceAddress?: string;
  transportMode?: TransportMode;
}): Promise<{ ok: true; profile: UserProfile } | { ok: false; error: string }> {
  const supabase = createSupabaseAdminClient();

  const fullRow = {
    phone: profile.phone,
    household_type: profile.householdType,
    priorities: profile.priorities,
    commute_area: profile.commuteArea ?? null,
    commute_area_custom: profile.commuteAreaCustom ?? null,
    workplace_address: profile.workplaceAddress ?? null,
    transport_mode: profile.transportMode ?? null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('user_profiles')
    .upsert(fullRow, { onConflict: 'phone' })
    .select('*')
    .single();

  if (data && !error) {
    return { ok: true, profile: rowToProfile(data as ProfileRow) };
  }

  if (error && isMissingTable(error)) {
    return { ok: false, error: 'TABLE_MISSING' };
  }

  // workplace_address 컬럼이 없을 때 (0005 미적용) → 그 필드 빼고 재시도
  if (error && isMissingColumn(error, 'workplace_address')) {
    const fallback = { ...fullRow };
    delete (fallback as Record<string, unknown>).workplace_address;
    const retry = await supabase
      .from('user_profiles')
      .upsert(fallback, { onConflict: 'phone' })
      .select('*')
      .single();
    if (retry.data && !retry.error) {
      return {
        ok: true,
        profile: rowToProfile({
          ...(retry.data as ProfileRow),
          workplace_address: null,
        }),
      };
    }
  }

  return { ok: false, error: error?.message ?? 'UNKNOWN' };
}
