import { apiGet, apiPatch } from '../lib/axios';
import { PATHS } from '../api/paths';
import type { Notification, NotificationFilter, NotificationsResponse } from '../types';

export function getNotifications(
  params?: { page?: number; limit?: number; filter?: NotificationFilter },
): Promise<NotificationsResponse> {
  return apiGet(PATHS.NOTIFICATIONS, params);
}

export function markNotificationRead(id: string): Promise<Notification> {
  return apiPatch(PATHS.NOTIFICATION_READ(id));
}
