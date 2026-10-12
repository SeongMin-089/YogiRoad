import type { SalesStatus } from '../types/sales';
import { requestJson } from './apiClient';

export { ApiError as SalesInsightsApiError } from './apiClient';

export type DashboardPeriod = 'WEEK' | 'MONTH' | 'ALL';

export type DashboardPeriodPerformance = {
  startInclusive: string | null;
  endExclusive: string | null;
  registeredStores: number;
  consultations: number;
};

export type SalesDashboard = {
  generatedAt: string;
  summary: {
    totalRegisteredStores: number;
    completedContracts: number;
    conversionRate: number;
    thisWeekConsultations: number;
  };
  periods: Record<DashboardPeriod, DashboardPeriodPerformance>;
  weeklyConsultations: Array<{
    date: string;
    dayLabel: string;
    consultations: number;
  }>;
  statusProgress: Array<{
    status: SalesStatus;
    count: number;
    percentage: number;
  }>;
  recentCompletedStores: Array<{
    storeId: string;
    storeName: string;
    category: string;
    address: string;
    registeredAt: string;
  }>;
};

export function getSalesDashboard(): Promise<SalesDashboard> {
  return requestJson('/api/sales-activities/dashboard');
}
