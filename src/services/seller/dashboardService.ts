import { Op } from 'sequelize';
import { Product } from '../../models/Product';

export interface DashboardStats {
  totalViews: number;
  viewsGrowthPercent: number;
  wishlistSaves: number;
  wishlistGrowthPercent: number;
  totalProducts: number;
  productsAddedThisWeek: number;
  interestRate: number;
  interestRateGrowthPercent: number;
}

export async function getSellerDashboardStats(sellerId: string): Promise<DashboardStats> {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [totalProducts, productsAddedThisWeek] = await Promise.all([
    Product.count({ where: { sellerId } }),
    Product.count({ where: { sellerId, createdAt: { [Op.gte]: weekAgo } } }),
  ]);

  return {
    totalViews: 0,
    viewsGrowthPercent: 0,
    wishlistSaves: 0,
    wishlistGrowthPercent: 0,
    totalProducts,
    productsAddedThisWeek,
    interestRate: 0,
    interestRateGrowthPercent: 0,
  };
}
