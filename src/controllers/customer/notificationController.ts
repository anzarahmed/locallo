import type { Request, Response } from 'express';
import { sendSuccess, handleServiceError } from '../../utils/response';
import { parsePagination } from '../../utils/pagination';
import * as notificationService from '../../services/customer/notificationService';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
}

export async function getNotifications(req: Request, res: Response): Promise<void> {
  const { page, limit } = parsePagination(req);
  const { rows, count } = await notificationService.listNotifications(req.customer!.id, page, limit);

  const notifications: NotificationItem[] = rows.map((n) => ({
    id: n.id,
    title: n.title,
    message: n.message,
    type: n.type,
    isRead: n.isRead,
  }));

  sendSuccess(res, { notifications, total: count, page, limit }, 'Notifications fetched');
}

export async function markNotificationRead(req: Request, res: Response): Promise<void> {
  try {
    const notification = await notificationService.markNotificationRead(req.customer!.id, String(req.params.id));
    const item: NotificationItem = {
      id: notification.id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      isRead: notification.isRead,
    };
    sendSuccess(res, item, 'Notification marked as read');
  } catch (err: unknown) {
    handleServiceError(err, res, 'Notification not found');
  }
}

export async function deleteNotification(req: Request, res: Response): Promise<void> {
  try {
    await notificationService.deleteNotification(req.customer!.id, String(req.params.id));
    sendSuccess(res, null, 'Notification deleted');
  } catch (err: unknown) {
    handleServiceError(err, res, 'Notification not found');
  }
}
