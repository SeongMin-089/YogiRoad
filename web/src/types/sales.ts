export const SALES_STATUSES = ['미방문', '상담중', '재방문', '계약완료', '거절'] as const;
export type SalesStatus = (typeof SALES_STATUSES)[number];

export const SALES_ACTIVITY_TYPES = ['방문', '전화', '상담', '재방문', '기타'] as const;
export type SalesActivityType = (typeof SALES_ACTIVITY_TYPES)[number];

export type SalesTarget = {
  storeId: string;
  storeName: string;
  category: string;
  address: string;
  latitude: number;
  longitude: number;
  status: SalesStatus;
  memo: string;
  registeredAt: string;
  sourceType?: 'PUBLIC_STORE' | 'RESTAURANT_LICENSE' | null;
  sourceId?: string | null;
};

export type CreateSalesTargetRequest = {
  storeId: string;
  storeName: string;
  category: string;
  address: string;
  latitude: number;
  longitude: number;
  sourceType?: 'PUBLIC_STORE' | 'RESTAURANT_LICENSE';
  sourceId?: string;
};

export type UpdateSalesTargetRequest = {
  status: SalesStatus;
  memo: string;
};

export type SalesActivity = {
  id: string;
  storeId: string;
  type: SalesActivityType;
  content: string;
  nextActionAt: string | null;
  createdAt: string;
};

export type CreateSalesActivityRequest = {
  type: SalesActivityType;
  content: string;
  nextActionAt: string | null;
};

export type SalesPriority = {
  storeId: string;
  storeName: string;
  category: string;
  address: string;
  status: SalesStatus;
  priorityScore: number;
  reason: string;
  nextActionAt: string | null;
};

export type UpcomingSalesAction = {
  activityId: string;
  storeId: string;
  storeName: string;
  category: string;
  address: string;
  status: SalesStatus;
  type: SalesActivityType;
  content: string;
  nextActionAt: string;
};

export type DashboardPeriod = 'WEEK' | 'MONTH' | 'ALL';

export type SalesDashboard = {
  generatedAt: string;
  summary: {
    totalRegisteredStores: number;
    completedContracts: number;
    conversionRate: number;
    thisWeekConsultations: number;
  };
  periods: Record<DashboardPeriod, {
    startInclusive: string | null;
    endExclusive: string | null;
    registeredStores: number;
    consultations: number;
  }>;
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

export type RestaurantLicenseCandidate = {
  managementNumber: string;
  storeId: string;
  storeName: string;
  licenseDate: string;
  statusCode: string;
  statusName: string;
  businessType: string;
  address: string;
  roadAddress: string;
  lotNumberAddress: string;
  telephone: string;
  latitude: number | null;
  longitude: number | null;
  coordinateSource: 'EPSG_5174' | 'ADDRESS_REQUIRED';
};
