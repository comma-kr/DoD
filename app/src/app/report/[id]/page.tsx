import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/session';
import ReportMarkdown from '@/components/report/ReportMarkdown';
import ReportTocBar from '@/components/report/ReportTocBar';
import ReportByline from '@/components/report/ReportByline';
import UpsellCTAs from '@/components/report/UpsellCTAs';
import ProfileBadge from '@/components/report/ProfileBadge';
import ShareBar from '@/components/report/ShareBar';
import PriceChart from '@/components/report/PriceChart';
import ApartmentSpecs from '@/components/report/ApartmentSpecs';
import RegionPercentileBar from '@/components/report/RegionPercentileBar';
import CompareSuggestionsCard from '@/components/report/CompareSuggestionsCard';
import LocationSection, {
  type ApartmentLocation,
} from '@/components/report/LocationSection';
import { PRODUCT_NAMES, type ProductId } from '@/lib/pricing';
import { extractH2Headings } from '@/lib/markdown';
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
          한 장 펼쳐보기
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
    tldr?: string;
    compareSuggestions?: import('@/lib/compare-suggestions').CompareSuggestion[];
    trades?: Array<{ dealDate: string; priceM10k: number; areaM2: number; floor?: number }>;
    apartmentName?: string;
    apartments?: Array<
      ApartmentLocation & {
        trades?: Array<{ dealDate: string; priceM10k: number; areaM2: number; floor?: number }>;
        jeonseRatio?: import('@/lib/jeonse-ratio').JeonseRatioResult | null;
        regionPercentile?: import('@/lib/region-stats').RegionPercentileResult | null;
      }
    >;
  };
  const markdown = content.markdown ?? '';
  const tldr = content.tldr ?? null;
  const trades = content.trades ?? [];
  const apartmentName = content.apartmentName ?? '';
  const apartments = content.apartments ?? [];
  // 무료 단독 리포트는 top-level trades, 비교 리포트는 apartments[].trades 에 각각 저장
  const mainApt = apartments[0];
  const specsTrades = trades.length > 0 ? trades : mainApt?.trades ?? [];
  const specsJeonse = mainApt?.jeonseRatio ?? null;
  const regionPercentile = mainApt?.regionPercentile ?? null;
  const compareSuggestions = content.compareSuggestions ?? [];
  const headings = extractH2Headings(markdown);
  const typeName = PRODUCT_NAMES[report.report_type as ProductId] ?? '리포트';
  const isFree = report.price === 0;
  const conditions = (report.user_conditions ?? {}) as StoredConditions;

  return (
    <main className="flex-1">
      <ReportTocBar headings={headings} />
      <article className="mx-auto max-w-3xl px-6 pt-16 pb-20">
        <header className="mb-8">
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
          </div>
          <h1 className="mt-4 border-l-4 border-primary pl-5 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            {report.title}
          </h1>
          <ReportByline
            subject={mainApt?.name ?? report.title}
            householdType={conditions.householdType ?? null}
            priorityTop={conditions.priorities?.[0] ?? null}
            createdAt={report.created_at}
          />
        </header>

        {conditions.householdType ? (
          <div className="mb-8">
            <ProfileBadge conditions={conditions} />
          </div>
        ) : null}

        {tldr ? (
          <div className="mb-8 rounded-2xl border-l-4 border-primary bg-primary-soft/50 px-5 py-4">
            <div className="text-[11px] font-semibold text-primary-ink">
              ✨ 이 단지 한 줄로
            </div>
            <p className="mt-1.5 text-[15px] font-semibold leading-relaxed text-foreground">
              {tldr}
            </p>
          </div>
        ) : null}

        {apartments.length > 0 ? (
          <div className="mb-10">
            <LocationSection
              apartments={apartments}
              highlightCommuteArea={conditions.commuteArea ?? null}
              workplaceAddress={conditions.workplaceAddress ?? null}
              householdType={conditions.householdType ?? null}
              priorities={conditions.priorities ?? null}
            />
          </div>
        ) : null}

        <ReportMarkdown markdown={markdown} />

        {regionPercentile ? (
          <div className="mt-10">
            <RegionPercentileBar data={regionPercentile} />
          </div>
        ) : null}

        {specsTrades.length > 0 ? (
          <div className="mt-6">
            <ApartmentSpecs
              trades={specsTrades}
              totalUnits={mainApt?.totalUnits ?? null}
              builtYear={mainApt?.builtYear ?? null}
              jeonseRatio={specsJeonse}
            />
          </div>
        ) : null}

        {trades.length > 0 ? (
          <div className="mt-6">
            <PriceChart trades={trades} apartmentName={apartmentName} />
          </div>
        ) : null}

        {compareSuggestions.length > 0 && mainApt ? (
          <div className="mt-10">
            <CompareSuggestionsCard
              currentApartmentId={mainApt.id}
              currentApartmentName={mainApt.name}
              suggestions={compareSuggestions}
            />
          </div>
        ) : null}

        <div className="mt-10">
          <ShareBar title={report.title} />
        </div>

        <UpsellCTAs
          householdType={conditions.householdType ?? null}
          currentApartmentId={mainApt?.id ?? null}
          currentApartmentName={mainApt?.name ?? null}
        />

        <p className="mt-10 text-center text-xs text-foreground-sub">
          본 자료는 공공데이터 기반 참고용 정보이며, 판단의 책임은 이용자에게
          있습니다.
        </p>
      </article>
    </main>
  );
}
