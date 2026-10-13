export type RestaurantNotification = {
  id: string;
  type: 'NEW_RESTAURANT_LICENSE';
  managementNumber: string;
  storeName: string;
  businessType: string;
  address: string;
  roadAddress: string;
  lotNumberAddress: string;
  licenseDate: string;
  regionKey: string;
  latitude: number | null;
  longitude: number | null;
  isRead: boolean;
  createdAt: string;
  readAt: string | null;
};

export type NotificationPage = {
  items: RestaurantNotification[];
  page: number;
  size: number;
  hasNext: boolean;
};
