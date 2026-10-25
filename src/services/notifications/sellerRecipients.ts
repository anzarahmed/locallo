import { Op } from 'sequelize';
import { User } from '../../models/User';
import { SellerProfile } from '../../models/SellerProfile';
import type { NotificationSettings } from '../../types';

export interface SellerRecipient {
  userId: string;
  email: string | null;
  name: string;
  businessName: string | null;
  settings: Partial<NotificationSettings>;
}

function toRecipient(user: User): SellerRecipient {
  const profile = user.sellerProfile;
  return {
    userId: user.id,
    email: profile?.email || user.email || null,
    name: user.fullName || profile?.businessName || 'Seller',
    businessName: profile?.businessName ?? null,
    settings: profile?.notificationSettings ?? {},
  };
}

// Deliberately ignores isActive: the account-deleted email goes to a deactivated seller.
export async function loadSellerRecipients(userIds: string[]): Promise<Map<string, SellerRecipient>> {
  if (userIds.length === 0) return new Map();
  const users = await User.findAll({
    where: { id: { [Op.in]: userIds }, role: 'SELLER' },
    attributes: ['id', 'fullName', 'email'],
    include: [{ model: SellerProfile, attributes: ['email', 'businessName', 'notificationSettings'] }],
  });
  return new Map(users.map((u) => [u.id, toRecipient(u)]));
}

export async function getSellerRecipient(userId: string): Promise<SellerRecipient | null> {
  return (await loadSellerRecipients([userId])).get(userId) ?? null;
}
