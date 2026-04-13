import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/session';
import ReportMarkdown from '@/components/report/ReportMarkdown';
import UpsellCTAs from '@/components/report/UpsellCTAs';
import ProfileBadge from '@/components/report/ProfileBadge';
import ShareBar from '@/components/report/ShareBar';
import PriceChart from '@/components/report/PriceChart';
import LocationSection, {
  type ApartmentLocation,
} from '@/components/report/LocationSection';
import { PRODUCT_NAMES, type ProductId } from '@/lib/pricing';
import { formatDate } from '@/lib/utils';
import type {
  HouseholdType,
  Priority,
  CommuteArea,
} from '@/types/profile';

interface PageProps {
  params: Promise<{ id: string }>;
}

interface StoredConditions {
  householdType?: HouseholdType;
  priorities?: Priority[];
  commuteArea?: CommuteArea;
  workplaceAddress?: string;
}

export default async function ReportPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getSession();
  if (!session) {
    return (
      <main className="mx-auto flex max-w-xl flex-1 flex-col items-center px-6 py-24 text-center">
        <h1 className="text-2xl font-bold">로그인이 필요해요</h1>
        <p className="mt-3 text-foreground-sub">
          보관함을 열려면 전화번호로 다시 인증해주세요.
        </p>
        <Link
          href="/analyze"
          className="mt-6 rounded-xl bg-primary px-5 py-3 font-semibold text-white"
        >
          분석 시작하기
        </Link>
      </main>
    );
  }

  const supabase = createSupabaseAdminClient();
  const { data: report } = await supabase
    .from('reports')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (!report || report.phone !== session.phone) {
    notFound();
  }

  const content = (report.content ?? {}) as {
    markdown?: string;
    trades?: Array<{ dealDate: string; priceM10k: number; areaM2: number; floor?: number }>;
    apartmentName?: string;
    apartments?: ApartmentLocation[];
  };
  const markdown = content.markdown ?? '';
  const trades = content.trades ?? [];
  const apartmentName = content.apartmentName ?? '';
  const apartments = content.apartments ?? [];
  const typeName = PRODUCT_NAMES[report.report_type as ProductId] ?? '리포트';
  const isFree = report.price === 0;
  const conditions = (report.user_conditions ?? {}) as StoredConditions;

  return (
    <main className="flex-1">
      <article className="mx-auto max-w-3xl px-6 pt-12 pb-20">
        <header className="mb-8 border-b border-border pb-8">
          <div className="flex items-center gap-2 text-xs text-foreground-sub">
            <span className="rounded-full border border-border px-2.5 py-1">
              {typeName}
            </span>
            {isFree ? (
              <span className="rounded-full border border-accent/40 bg-accent/10 px-2.5 py-1 text-accent">
                무료
              </span>
            ) : (
              <span className="rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-primary">
                결제 완료
              </span>
            )}
            <span>{formatDate(report.created_at)}</span>
          </div>
          <h1 className="mt-4 text-3xl font-bold sm:text-4xl">{report.title}</h1>
        </header>

        {conditions.householdType ? (
          <div className="mb-8">
            <ProfileBadge conditions={conditions} />
          </div>
        ) : null}

        {apartments.length > 0 ? (
          <div className="mb-10">
            <LocationSection
              apartments={apartments}
              highlightCommuteArea={conditions.commuteArea ?? null}
              workplaceAddress={conditions.workplaceAddress ?? null}
            />
          </div>
        ) : null}

        <ReportMarkdown markdown={markdown} />

        {trades.length > 0 ? (
          <div className="mt-8">
            <PriceChart trades={trades} apartmentName={apartmentName} />
          </div>
        ) : null}

        <div className="mt-10">
          <ShareBar title={report.title} />
        </div>

        <UpsellCTAs />

        <p className="mt-10 text-center text-xs text-foreground-sub">
          본 자료는 공공데이터 기반 참고용 정보이며, 판단의 책임은 이용자에게
          있습니다.
        </p>
      </article>
    </main>
  );
}
