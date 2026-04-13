'use client';

import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Props {
  className?: string;
}

export default function LogoutButton({ className = '' }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.refresh();
      router.push('/');
    } catch {
      // noop — 실패해도 쿠키만 클라에서 강제 삭제
      document.cookie = 'ipji_session=; Max-Age=0; path=/';
      router.push('/');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 rounded-lg border border-border bg-transparent px-3 py-1.5 text-xs text-foreground-sub transition hover:border-foreground-sub/50 hover:text-foreground disabled:opacity-40 ${className}`}
    >
      <LogOut className="h-3.5 w-3.5" />
      {loading ? '로그아웃 중...' : '다른 번호로'}
    </button>
  );
}
