import { apiGet, apiPatch, apiDelete } from '../lib/axios';
import { PATHS } from '../api/paths';
import type { Notification, NotificationsResponse } from '../types';

export function getNotifications(params?: { page?: number; limit?: number }): Promise<NotificationsResponse> {
  return apiGet(PATHS.NOTIFICATIONS, params);
}

export function markNotificationRead(id: string): Promise<Notification> {
  return apiPatch(PATHS.NOTIFICATION_READ(id));
}

export function deleteNotification(id: string): Promise<void> {
  return apiDelete(PATHS.NOTIFICATION_BY_ID(id));
}
