import type { ProductId } from '@/lib/pricing';

export type ReportStatus = 'pending' | 'paid' | 'generated';

export interface ReportSectionBlock {
  title: string;
  body: string;
}

export interface FreeDeepSingleContent {
  summary: string;
  sections: ReportSectionBlock[];
  disclaimer: string;
}

export interface CompareContent {
  summary: string;
  table: Array<Record<string, string | number>>;
  sections: ReportSectionBlock[];
  disclaimer: string;
}

export interface Report {
  id: string;
  userId?: string;
  phone: string;
  reportType: ProductId;
  title: string;
  apartmentIds: string[];
  userConditions?: Record<string, unknown>;
  content: FreeDeepSingleContent | CompareContent | Record<string, unknown>;
  price: number;
  status: ReportStatus;
  createdAt: string;
}
