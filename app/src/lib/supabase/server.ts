import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // 스키마 이관(2026-06-21): ChillaeMallae 테이블이 public→chillae 로 이동.
      // env 미설정 시 public(이전 동작) 유지 — 가역.
      db: { schema: process.env.NEXT_PUBLIC_SUPABASE_SCHEMA || 'public' },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // 서버 컴포넌트에서 호출된 경우 무시 (middleware가 세션 갱신 담당)
          }
        },
      },
    }
  );
}

// 관리 작업용 (서비스 롤) — API 라우트 서버 사이드 전용
export function createSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      db: { schema: process.env.NEXT_PUBLIC_SUPABASE_SCHEMA || 'public' },
      auth: { autoRefreshToken: false, persistSession: false },
    }
  );
}
