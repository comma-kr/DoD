// 커스텀 세션 관리 (전화번호 기반)
// Supabase Auth 대신 sessions 테이블 + httpOnly 쿠키 사용.
// SMS 인증 완료 시 세션 생성, 쿠키에 session_id 저장.

import { cookies } from 'next/headers';
import { createSupabaseAdminClient } from './supabase/server';

const SESSION_COOKIE = 'ipji_session';
const SESSION_TTL_DAYS = 30;

export interface SessionData {
  id: string;
  phone: string;
  expiresAt: string;
}

export async function createSession(phone: string): Promise<SessionData> {
  const supabase = createSupabaseAdminClient();
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from('sessions')
    .insert({ phone, expires_at: expiresAt.toISOString() })
    .select('id, phone, expires_at')
    .single();

  if (error || !data) {
    throw new Error(`세션 생성 실패: ${error?.message}`);
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, data.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
    path: '/',
  });

  return { id: data.id, phone: data.phone, expiresAt: data.expires_at };
}

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('sessions')
    .select('id, phone, expires_at')
    .eq('id', sessionId)
    .maybeSingle();

  if (error || !data) return null;
  if (new Date(data.expires_at) < new Date()) return null;

  return { id: data.id, phone: data.phone, expiresAt: data.expires_at };
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;

  if (sessionId) {
    const supabase = createSupabaseAdminClient();
    await supabase.from('sessions').delete().eq('id', sessionId);
  }

  cookieStore.delete(SESSION_COOKIE);
}

export async function requireSession(): Promise<SessionData> {
  const session = await getSession();
  if (!session) {
    throw new Error('UNAUTHORIZED');
  }
  return session;
}
