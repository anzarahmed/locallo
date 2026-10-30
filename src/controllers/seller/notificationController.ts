import type { Request, Response } from 'express';
import { sendSuccess, handleServiceError } from '../../utils/response';
import { parsePagination } from '../../utils/pagination';
import * as notificationService from '../../services/customer/notificationService';
import type { NotificationFilter } from '../../services/customer/notificationService';
import type { Notification } from '../../models/Notification';
import type { OfferType } from '../../types';

const NOTIFICATION_FILTERS: readonly NotificationFilter[] = ['all', 'offers', 'other'];

function parseFilter(req: Request): NotificationFilter {
  const raw = String(req.query.filter ?? 'all');
  return (NOTIFICATION_FILTERS as readonly string[]).includes(raw) ? (raw as NotificationFilter) : 'all';
}

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  referenceType: string | null;
  referenceId: string | null;
  offerType: OfferType | null;
  isRead: boolean;
  createdAt: Date;
}

function toItem(n: Notification, offerTypes: Map<string, OfferType>): NotificationItem {
  return {
    id: n.id,
    title: n.title,
    message: n.message,
    type: n.type,
    referenceType: n.referenceType,
    referenceId: n.referenceId,
    offerType: n.referenceType === 'offer' ? offerTypes.get(n.referenceId ?? '') ?? null : null,
    isRead: n.isRead,
    createdAt: n.createdAt,
  };
}

export async function getNotifications(req: Request, res: Response): Promise<void> {
  const { page, limit } = parsePagination(req);
  const filter = parseFilter(req);
  const { rows, count } = await notificationService.listNotifications(req.seller!.id, page, limit, filter);
  // Must run after listNotifications, which marks the returned rows as read.
  const unreadCount = await notificationService.countUnreadNotifications(req.seller!.id);
  const offerTypes = await notificationService.getOfferTypes(rows);
  const notifications = rows.map((n) => toItem(n, offerTypes));
  sendSuccess(res, { notifications, total: count, page, limit, unreadCount }, 'Notifications fetched');
}

export async function markNotificationRead(req: Request, res: Response): Promise<void> {
  try {
    const notification = await notificationService.markNotificationRead(req.seller!.id, String(req.params.id));
    const offerTypes = await notificationService.getOfferTypes([notification]);
    sendSuccess(res, toItem(notification, offerTypes), 'Notification marked as read');
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
