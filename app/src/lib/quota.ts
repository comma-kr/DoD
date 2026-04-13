// 무료 쿼터 체크 및 소진 로직
// "계정(phone)당 1회 무료" 원칙을 강제한다.
// 테스트 번호(TEST_PHONE)는 쿼터 제한 없이 무제한 생성 가능.

import { createSupabaseAdminClient } from './supabase/server';
import { TEST_PHONE } from './test-bypass';

export interface QuotaCheckResult {
  hasQuota: boolean;
  usedAt?: string;
  usedApartmentId?: string;
}

export async function checkFreeQuota(phone: string): Promise<QuotaCheckResult> {
  // 테스트 번호는 무제한 쿼터
  if (phone === TEST_PHONE) {
    return { hasQuota: true };
  }

  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from('user_free_quota')
    .select('used_at, used_apartment_id')
    .eq('phone', phone)
    .maybeSingle();

  if (error) {
    throw new Error(`쿼터 조회 실패: ${error.message}`);
  }

  if (!data || !data.used_at) {
    return { hasQuota: true };
  }

  return {
    hasQuota: false,
    usedAt: data.used_at,
    usedApartmentId: data.used_apartment_id,
  };
}

export async function consumeFreeQuota(
  phone: string,
  apartmentId: string
): Promise<void> {
  // 테스트 번호는 소진 기록 안 남김
  if (phone === TEST_PHONE) {
    return;
  }

  const supabase = createSupabaseAdminClient();

  const { error } = await supabase.from('user_free_quota').upsert(
    {
      phone,
      used_at: new Date().toISOString(),
      used_apartment_id: apartmentId,
    },
    { onConflict: 'phone' }
  );

  if (error) {
    throw new Error(`쿼터 소진 기록 실패: ${error.message}`);
  }
}
