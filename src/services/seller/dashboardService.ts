import { Op } from 'sequelize';
import { Product } from '../../models/Product';
import { ProductView } from '../../models/ProductView';

export interface DashboardStats {
  totalViews: number;
  viewsGrowthPercent: number;
  wishlistSaves: number;
  wishlistGrowthPercent: number;
  totalProducts: number;
  productsAddedThisWeek: number;
  avgRating: number;
  reviewCount: number;
}

export async function getSellerDashboardStats(sellerId: string): Promise<DashboardStats> {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const twoMonthsAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

  const [totalProducts, productsAddedThisWeek, viewsThisMonth, viewsLastMonth] = await Promise.all([
    Product.count({ where: { sellerId } }),
    Product.count({ where: { sellerId, createdAt: { [Op.gte]: weekAgo } } }),
    ProductView.count({ where: { sellerId, viewedAt: { [Op.gte]: monthAgo } } }),
    ProductView.count({ where: { sellerId, viewedAt: { [Op.between]: [twoMonthsAgo, monthAgo] } } }),
  ]);

  const viewsGrowthPercent = viewsLastMonth === 0
    ? (viewsThisMonth > 0 ? 100 : 0)
    : Math.round(((viewsThisMonth - viewsLastMonth) / viewsLastMonth) * 100);

  return {
    totalViews: viewsThisMonth,
    viewsGrowthPercent,
    wishlistSaves: 0,
    wishlistGrowthPercent: 0,
    totalProducts,
    productsAddedThisWeek,
    avgRating: 0,
    reviewCount: 0,
  };
}
