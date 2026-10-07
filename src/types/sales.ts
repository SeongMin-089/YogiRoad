export const SALES_STATUSES = ['미방문', '상담중', '재방문', '계약완료', '거절'] as const;

export type SalesStatus = (typeof SALES_STATUSES)[number];

export const SALES_ACTIVITY_TYPES = ['방문', '전화', '상담', '재방문', '기타'] as const;

export type SalesActivityType = (typeof SALES_ACTIVITY_TYPES)[number];
