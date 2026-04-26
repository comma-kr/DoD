'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Sparkles } from 'lucide-react';
import ProfileForm from '@/components/analyze/ProfileForm';
import type {
  HouseholdType,
  Priority,
  CommuteArea,
  UserProfile,
} from '@/types/profile';

export default function ProfileEditPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [initial, setInitial] = useState<{
    householdType?: HouseholdType;
    priorities?: Priority[];
    commuteArea?: CommuteArea;
  } | null>(null);

  useEffect(() => {
    async function bootstrap() {
      try {
        const me = await fetch('/api/auth/me').then((r) => r.json());
        if (!me.authenticated) {
          setAuthed(false);
          setLoading(false);
          return;
        }
        setAuthed(true);

        const profRes = await fetch('/api/profile/me');
        if (profRes.ok) {
          const data = await profRes.json();
          if (data.profile) {
            const p = data.profile as UserProfile;
            setInitial({
              householdType: p.householdType,
              priorities: p.priorities,
              commuteArea: p.commuteArea,
            });
          }
        }
      } finally {
        setLoading(false);
      }
    }
    bootstrap();
  }, []);

  function handleComplete() {
    router.push('/mypage');
  }

  if (loading) {
    return (
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-6 pt-20 text-center text-foreground-sub">
          불러오는 중...
        </div>
      </main>
    );
  }

  if (!authed) {
    return (
      <main className="flex flex-1 items-center justify-center px-6">
        <div className="w-full max-w-md rounded-3xl border border-border bg-surface p-10 text-center shadow-sm">
          <h1 className="text-xl font-bold">로그인이 필요해요</h1>
          <p className="mt-2 text-sm text-foreground-sub">
            프로필을 수정하려면 먼저 전화번호로 인증해주세요.
          </p>
          <Link
            href="/analyze"
            className="mt-6 inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white"
          >
            한 장 펼쳐보기
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1">
      <section className="mx-auto max-w-3xl px-6 pt-12 pb-24">
        <button
          onClick={() => router.back()}
          className="mb-6 flex items-center gap-1 text-sm text-foreground-sub hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> 뒤로
        </button>
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-1.5 text-xs text-foreground-sub">
          <Sparkles className="h-3.5 w-3.5 text-secondary" />
          내 프로필 수정
        </div>
        <ProfileForm
          onComplete={handleComplete}
          initialProfile={initial ?? undefined}
        />
      </section>
    </main>
  );
}
