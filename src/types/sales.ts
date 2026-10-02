export type SalesStatus = '미방문' | '상담중' | '재방문' | '계약완료' | '거절';
export type Store = {
  id: string;
  name: string;
  category: string;
  address: string;
  status: SalesStatus;
  distance?: string;
  meta?: string;
};
