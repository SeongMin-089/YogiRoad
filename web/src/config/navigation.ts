import type { IconName } from '../components/Icon';

export type NavigationItem = {
  path: string;
  label: string;
  icon: IconName;
  end?: boolean;
};

export const navigationItems: NavigationItem[] = [
  { path: '/', label: '홈', icon: 'home', end: true },
  { path: '/map', label: '지도', icon: 'map' },
  { path: '/sales', label: '영업관리', icon: 'briefcase' },
  { path: '/dashboard', label: '대시보드', icon: 'chart' },
  { path: '/my', label: '마이', icon: 'user' },
];
