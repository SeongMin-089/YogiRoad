export const SALES_STATUSES = ['미방문', '상담중', '재방문', '계약완료', '거절'] as const;

export type SalesStatus = (typeof SALES_STATUSES)[number];
