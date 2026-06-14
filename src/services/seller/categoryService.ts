import { Op } from 'sequelize';
import { Category } from '../../models/Category';
import { SellerProfile } from '../../models/SellerProfile';

export async function getSellerCategories(sellerId: string): Promise<Category[]> {
  const profile = await SellerProfile.findOne({ where: { userId: sellerId } });
  const categoryIds: number[] = profile?.categoryIds ?? [];

  if (categoryIds.length === 0) return [];

  return Category.findAll({
    where: { id: { [Op.in]: categoryIds }, isActive: true },
    order: [['name', 'ASC']],
  });
}
