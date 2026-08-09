import { Notification } from '../../models/Notification';

export async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: string,
  referenceType?: string,
  referenceId?: string,
): Promise<Notification> {
  return Notification.create({
    customerId: userId,
    title,
    message,
    type,
    referenceType: referenceType ?? null,
    referenceId: referenceId ?? null,
  });
}

export async function listNotifications(
  customerId: string,
  page: number,
  limit: number,
): Promise<{ rows: Notification[]; count: number }> {
  const { rows, count } = await Notification.findAndCountAll({
    where: { customerId },
    order: [['createdAt', 'DESC']],
    limit,
    offset: (page - 1) * limit,
  });

  return { rows, count };
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
