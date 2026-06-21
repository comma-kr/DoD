import { createBrowserClient } from '@supabase/ssr';

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    // 스키마 이관(2026-06-21): public→chillae. env 미설정 시 public 유지(가역).
    { db: { schema: process.env.NEXT_PUBLIC_SUPABASE_SCHEMA || 'public' } }
  );
}
