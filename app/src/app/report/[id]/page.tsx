import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/session';
import ReportMarkdown from '@/components/report/ReportMarkdown';
import UpsellCTAs from '@/components/report/UpsellCTAs';
import ProfileBadge from '@/components/report/ProfileBadge';
import ShareBar from '@/components/report/ShareBar';
import PriceChart from '@/components/report/PriceChart';
import ApartmentSpecs from '@/components/report/ApartmentSpecs';
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
    apartments?: Array<
      ApartmentLocation & {
        trades?: Array<{ dealDate: string; priceM10k: number; areaM2: number; floor?: number }>;
      }
    >;
  };
  const markdown = content.markdown ?? '';
  const trades = content.trades ?? [];
  const apartmentName = content.apartmentName ?? '';
  const apartments = content.apartments ?? [];
  // 무료 단독 리포트는 top-level trades, 비교 리포트는 apartments[].trades 에 각각 저장
  const mainApt = apartments[0];
  const specsTrades = trades.length > 0 ? trades : mainApt?.trades ?? [];
  const typeName = PRODUCT_NAMES[report.report_type as ProductId] ?? '리포트';
  const isFree = report.price === 0;
  const conditions = (report.user_conditions ?? {}) as StoredConditions;

  return (
    <main className="flex-1">
      <article className="mx-auto max-w-3xl px-6 pt-16 pb-20">
        <header className="mb-10 border-b border-border pb-8">
          <div className="flex flex-wrap items-center gap-2">
            {isFree ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-success">
                FREE · {typeName}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-warning-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-warning">
                PAID · {typeName}
              </span>
            )}
            <span className="text-xs text-foreground-sub">
              {formatDate(report.created_at)}
            </span>
          </div>
          <h1 className="mt-5 border-l-4 border-primary pl-5 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            {report.title}
          </h1>
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

        {specsTrades.length > 0 ? (
          <div className="mt-10">
            <ApartmentSpecs
              trades={specsTrades}
              totalUnits={mainApt?.totalUnits ?? null}
              builtYear={mainApt?.builtYear ?? null}
            />
          </div>
        ) : null}

        {trades.length > 0 ? (
          <div className="mt-6">
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
