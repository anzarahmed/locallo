import type { Request, Response } from 'express';
import { sendSuccess, handleServiceError } from '../../utils/response';
import { parsePagination } from '../../utils/pagination';
import * as notificationService from '../../services/customer/notificationService';
import type { Notification } from '../../models/Notification';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  referenceType: string | null;
  referenceId: string | null;
  isRead: boolean;
  createdAt: Date;
}

function toItem(n: Notification): NotificationItem {
  return {
    id: n.id,
    title: n.title,
    message: n.message,
    type: n.type,
    referenceType: n.referenceType,
    referenceId: n.referenceId,
    isRead: n.isRead,
    createdAt: n.createdAt,
  };
}

export async function getNotifications(req: Request, res: Response): Promise<void> {
  const { page, limit } = parsePagination(req);
  const { rows, count } = await notificationService.listNotifications(req.seller!.id, page, limit);
  const notifications = rows.map(toItem);
  sendSuccess(res, { notifications, total: count, page, limit }, 'Notifications fetched');
}

export async function markNotificationRead(req: Request, res: Response): Promise<void> {
  try {
    const notification = await notificationService.markNotificationRead(req.seller!.id, String(req.params.id));
    sendSuccess(res, toItem(notification), 'Notification marked as read');
  } catch (err: unknown) {
    handleServiceError(err, res, 'Notification not found');
  }
}

export async function deleteNotification(req: Request, res: Response): Promise<void> {
  try {
    await notificationService.deleteNotification(req.seller!.id, String(req.params.id));
    sendSuccess(res, null, 'Notification deleted');
  } catch (err: unknown) {
    handleServiceError(err, res, 'Notification not found');
  }
}
