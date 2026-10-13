import { requestJson, requestNoContent } from './apiClient';
import type { NotificationPage } from '../types/notifications';

export function getNotifications(page = 0, size = 20): Promise<NotificationPage> {
  return requestJson(`/api/notifications?page=${page}&size=${size}`);
}

export async function getUnreadNotificationCount(): Promise<number> {
  const result = await requestJson<{ unreadCount: number }>('/api/notifications/unread-count');
  return result.unreadCount;
}

export function markNotificationRead(id: string): Promise<void> {
  return requestNoContent(`/api/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH' });
}

export function markAllNotificationsRead(): Promise<void> {
  return requestNoContent('/api/notifications/read-all', { method: 'PATCH' });
}
