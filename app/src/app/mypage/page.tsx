import Link from 'next/link';
import { FileText, Lock, UserCog } from 'lucide-react';
import { getSession } from '@/lib/session';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { loadProfile } from '@/lib/profile';
import { formatDate, formatPrice } from '@/lib/utils';
import { PRODUCT_NAMES, type ProductId } from '@/lib/pricing';
import { HOUSEHOLD_LABELS, HOUSEHOLD_EMOJIS } from '@/types/profile';
import LogoutButton from '@/components/layout/LogoutButton';

export default async function MyPage() {
  const session = await getSession();

  if (!session) {
    return (
      <main className="flex flex-1 items-center justify-center px-6">
        <div className="w-full max-w-md rounded-3xl border border-border bg-surface p-10 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-surface text-foreground-sub">
            <Lock className="h-5 w-5" />
          </div>
          <h1 className="mt-6 text-xl font-bold">보관함을 열려면 인증이 필요해요</h1>
          <p className="mt-2 text-sm text-foreground-sub">
            전화번호 인증만 하면 그동안 받은 리포트를 다시 보실 수 있어요.
          </p>
          <Link
            href="/analyze"
            className="mt-6 inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white"
          >
            분석하러 가기
          </Link>
        </div>
      </main>
    );
  }

  const supabase = createSupabaseAdminClient();
  const { data: reports } = await supabase
    .from('reports')
    .select('id, title, report_type, price, created_at')
    .eq('phone', session.phone)
    .order('created_at', { ascending: false });

  let profile = null;
  try {
    profile = await loadProfile(session.phone);
  } catch {
    profile = null;
  }

  const maskedPhone = session.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');

  return (
    <main className="flex-1">
      <section className="mx-auto max-w-3xl px-6 pt-16 pb-20">
        <header className="mb-10 flex items-start justify-between gap-4">
          <div>
            <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-warning-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-warning">
              MY · 보관함
            </span>
            <h1 className="text-3xl font-bold sm:text-4xl">
              내가 받은 <em className="report-highlight not-italic">리포트</em>
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-foreground-sub">
              {maskedPhone} 번호로 받은 리포트를 모아봤어요.
            </p>
          </div>
          <LogoutButton />
        </header>

        <Link
          href="/analyze/profile"
          className="mb-6 flex items-center gap-4 rounded-2xl border border-border bg-surface p-5 shadow-sm transition hover:border-primary/40"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary/15 text-secondary">
            <UserCog className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-foreground">
              {profile?.householdType
                ? `${HOUSEHOLD_EMOJIS[profile.householdType]} ${HOUSEHOLD_LABELS[profile.householdType]} 기준으로 설정됨`
                : '내 프로필 설정하기'}
            </div>
            <div className="text-xs text-foreground-sub">
              가족 형태와 우선순위를 바꾸면 리포트가 다시 쓰여요
            </div>
          </div>
          <span className="text-xs text-foreground-sub">수정 →</span>
        </Link>

        {!reports || reports.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-surface/40 p-10 text-center text-sm text-foreground-sub">
            아직 받은 리포트가 없어요.
            <br />
            <Link href="/analyze" className="mt-4 inline-block text-primary">
              분석 시작하기 →
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {reports.map((r) => {
              const typeName = PRODUCT_NAMES[r.report_type as ProductId] ?? '리포트';
              return (
                <li key={r.id}>
                  <Link
                    href={`/report/${r.id}`}
                    className="flex items-start gap-4 rounded-2xl border border-border bg-surface p-5 shadow-sm transition hover:border-primary/40"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{r.title}</h3>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-foreground-sub">
                        <span className="rounded-full border border-border px-2 py-0.5">
                          {typeName}
                        </span>
                        <span>{formatDate(r.created_at)}</span>
                        <span>
                          {r.price === 0 ? '무료' : formatPrice(r.price)}
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
