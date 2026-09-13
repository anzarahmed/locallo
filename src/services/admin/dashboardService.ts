import { Op } from 'sequelize';
import { SellerProfile } from '../../models/SellerProfile';
import { Product } from '../../models/Product';
import { Category } from '../../models/Category';
import { Admin } from '../../models/Admin';
import type { ActivityItem } from '../../types';

export async function getRecentActivity(limit: number): Promise<ActivityItem[]> {
  const [sellersAdded, sellersVerified, productsAdded, categoriesAdded, subAdminsAdded] = await Promise.all([
    SellerProfile.findAll({ order: [['createdAt', 'DESC']], limit }),
    SellerProfile.findAll({
      where: { isVerified: true, verifiedAt: { [Op.ne]: null } },
      order: [['verifiedAt', 'DESC']],
      limit,
    }),
    Product.findAll({ order: [['createdAt', 'DESC']], limit }),
    Category.findAll({ order: [['createdAt', 'DESC']], limit }),
    Admin.findAll({
      where: { role: { [Op.in]: ['manager', 'operator'] } },
      order: [['createdAt', 'DESC']],
      limit,
    }),
  ]);

  const items: ActivityItem[] = [];

  for (const seller of sellersAdded) {
    items.push({
      id: `seller_added:${seller.id}`,
      type: 'seller_added',
      message: `New seller registered: ${seller.businessName}`,
      timestamp: seller.createdAt.toISOString(),
    });
  }

  for (const seller of sellersVerified) {
    items.push({
      id: `seller_verified:${seller.id}`,
      type: 'seller_verified',
      message: `Seller verified: ${seller.businessName}`,
      timestamp: (seller.verifiedAt as Date).toISOString(),
    });
  }

  for (const product of productsAdded) {
    items.push({
      id: `product_added:${product.id}`,
      type: 'product_added',
      message: `New product added: ${product.name}`,
      timestamp: product.createdAt.toISOString(),
    });
  }

  for (const category of categoriesAdded) {
    items.push({
      id: `category_added:${category.id}`,
      type: 'category_added',
      message: `New category added: ${category.name}`,
      timestamp: category.createdAt.toISOString(),
    });
  }

  for (const admin of subAdminsAdded) {
    items.push({
      id: `subadmin_added:${admin.id}`,
      type: 'subadmin_added',
      message: `New sub-admin added: ${admin.fullName ?? admin.email} (${admin.role})`,
      timestamp: admin.createdAt.toISOString(),
    });
  }

  items.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  return items.slice(0, limit);
}
