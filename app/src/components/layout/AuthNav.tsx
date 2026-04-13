'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

interface Me {
  authenticated: boolean;
  phone?: string;
  expiresAt?: string;
}

export default function AuthNav() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (mounted) setMe(d);
      })
      .catch(() => {
        if (mounted) setMe({ authenticated: false });
      });
    return () => {
      mounted = false;
    };
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      document.cookie = 'ipji_session=; Max-Age=0; path=/';
      setMe({ authenticated: false });
      router.refresh();
      router.push('/');
    } finally {
      setLoggingOut(false);
    }
  }

  if (!me) {
    return <div className="h-9 w-9 animate-pulse rounded-full bg-surface" />;
  }

  if (!me.authenticated || !me.phone) {
    return null;
  }

  const masked = me.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1····$2');
  const daysLeft = me.expiresAt
    ? Math.max(
        0,
        Math.ceil(
          (new Date(me.expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)
        )
      )
    : null;

  return (
    <div className="flex items-center gap-2">
      <div className="hidden flex-col items-end leading-tight sm:flex">
        <span className="text-xs font-semibold text-foreground">{masked}</span>
        {daysLeft !== null ? (
          <span className="text-[10px] text-foreground-sub">
            세션 {daysLeft}일 남음
          </span>
        ) : null}
      </div>
      <button
        onClick={handleLogout}
        disabled={loggingOut}
        aria-label="로그아웃"
        title="로그아웃"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-foreground-sub transition hover:border-foreground-sub/50 hover:text-foreground disabled:opacity-40"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}
