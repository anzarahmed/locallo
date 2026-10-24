import { Op } from 'sequelize';
import { Notification } from '../../models/Notification';
import { OFFER_NOTIFICATION_TYPES } from '../notifications/templates';

export type NotificationFilter = 'all' | 'offers' | 'other';

export async function listNotifications(
  customerId: string,
  page: number,
  limit: number,
  filter: NotificationFilter = 'all',
): Promise<{ rows: Notification[]; count: number }> {
  const where: Record<string, unknown> = { customerId };
  if (filter === 'offers') where.type = { [Op.in]: OFFER_NOTIFICATION_TYPES };
  else if (filter === 'other') where.type = { [Op.notIn]: OFFER_NOTIFICATION_TYPES };

  const { rows, count } = await Notification.findAndCountAll({
    where,
    order: [['createdAt', 'DESC']],
    limit,
    offset: (page - 1) * limit,
  });

  const unreadIds = rows.filter((n) => !n.isRead).map((n) => n.id);
  if (unreadIds.length > 0) {
    await Notification.update({ isRead: true }, { where: { id: unreadIds, customerId } });
    rows.forEach((n) => { n.isRead = true; });
  }

  return { rows, count };
}

export async function countUnreadNotifications(customerId: string): Promise<number> {
  return Notification.count({ where: { customerId, isRead: false } });
}

export async function markNotificationRead(customerId: string, id: string): Promise<Notification> {
  const notification = await Notification.findOne({ where: { id, customerId } });
  if (!notification) {
    throw Object.assign(new Error('Notification not found'), { status: 404 });
  }

  if (!notification.isRead) {
    notification.isRead = true;
    await notification.save();
  }

  return notification;
}

export async function deleteNotification(customerId: string, id: string): Promise<void> {
  const notification = await Notification.findOne({ where: { id, customerId } });
  if (!notification) {
    throw Object.assign(new Error('Notification not found'), { status: 404 });
  }

  await notification.destroy();
}
