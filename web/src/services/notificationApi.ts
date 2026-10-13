import { requestJson, requestNoContent } from './apiClient';
import type { NotificationPage } from '../types/notifications';

export function getNotifications(page = 0, size = 20, signal?: AbortSignal): Promise<NotificationPage> {
  return requestJson(`/api/notifications?page=${page}&size=${size}`, { signal });
}

export async function getUnreadNotificationCount(signal?: AbortSignal): Promise<number> {
  const result = await requestJson<{ unreadCount: number }>('/api/notifications/unread-count', { signal });
  return result.unreadCount;
}

export function markNotificationRead(id: string): Promise<void> {
  return requestNoContent(`/api/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH' });
}

export function markAllNotificationsRead(): Promise<void> {
  return requestNoContent('/api/notifications/read-all', { method: 'PATCH' });
}
