import type { SalesStatus, Store } from '../types/sales';

// Presentation fixtures only. Replace this module with API-backed data when available.
export const profile = { name: '박성민', team: '영업 1팀', region: '남양주시 진접읍' };
export const statuses: SalesStatus[] = ['미방문', '상담중', '재방문', '계약완료', '거절'];
export const stores: Store[] = [
  { id: '1', name: '청년다방 진접점', category: '분식', address: '남양주시 진접읍', status: '상담중', distance: '1.2km', meta: '최근 상담 09.27 · 다음 방문 09.30' },
  { id: '2', name: '교촌치킨 진접점', category: '치킨', address: '남양주시 진접읍', status: '미방문', distance: '1.2km', meta: '아직 상담 기록이 없어요' },
  { id: '3', name: '카페 온더로드', category: '카페', address: '남양주시 오남읍', status: '재방문', distance: '2.4km', meta: '최근 상담 09.27 · 다음 방문 09.30' },
  { id: '4', name: '진접닭강정', category: '치킨', address: '남양주시 진접읍', status: '계약완료', distance: '0.8km', meta: '계약 완료 09.24' },
  { id: '5', name: '오남 수제버거', category: '양식', address: '남양주시 오남읍', status: '거절', distance: '3.1km', meta: '최근 상담 09.25' },
];
export const todayStats = [
  { label: '오늘 방문', value: '4' }, { label: '상담중', value: '7' },
  { label: '재방문 예정', value: '3' }, { label: '계약 완료', value: '12' },
];
export const visits = [{ store: stores[0], time: '14:00' }, { store: stores[2], time: '16:30' }];
export const activities = [
  { id: '1', name: '청년다방 진접점', description: '상담 상태를 “재방문”으로 변경', time: '오늘 11:32' },
  { id: '2', name: '카페 온더로드', description: '상담 기록을 추가했습니다', time: '어제 17:21' },
];
export const dashboardData = {
  '이번 달': {
    stats: [{ label: '방문 매장', value: '38' }, { label: '상담 진행', value: '21' }, { label: '계약 완료', value: '12' }, { label: '계약 전환율', value: '31.6%' }],
    progress: [{ status: '미방문', count: 8 }, { status: '상담중', count: 7 }, { status: '재방문', count: 3 }, { status: '계약완료', count: 12 }],
    contracts: [{ name: '청년다방 진접점', date: '09.26' }, { name: '진접닭강정', date: '09.24' }],
  },
  '이번 주': {
    stats: [{ label: '방문 매장', value: '12' }, { label: '상담 진행', value: '8' }, { label: '계약 완료', value: '3' }, { label: '계약 전환율', value: '25.0%' }],
    progress: [{ status: '미방문', count: 4 }, { status: '상담중', count: 5 }, { status: '재방문', count: 2 }, { status: '계약완료', count: 3 }],
    contracts: [{ name: '청년다방 진접점', date: '09.26' }],
  },
} satisfies Record<string, { stats: { label: string; value: string }[]; progress: { status: SalesStatus; count: number }[]; contracts: { name: string; date: string }[] }>;
