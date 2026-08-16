import { Op, fn, col } from 'sequelize';
import { Product } from '../../models/Product';
import { ProductView } from '../../models/ProductView';
import { Review } from '../../models/Review';
import { Wishlist } from '../../models/Wishlist';

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

  const [
    totalProducts,
    productsAddedThisWeek,
    viewsThisMonth,
    viewsLastMonth,
    ratingStats,
    wishlistSaves,
    wishlistThisMonth,
    wishlistLastMonth,
  ] = await Promise.all([
    Product.count({ where: { sellerId } }),
    Product.count({ where: { sellerId, createdAt: { [Op.gte]: weekAgo } } }),
    ProductView.count({ where: { sellerId, viewedAt: { [Op.gte]: monthAgo } } }),
    ProductView.count({ where: { sellerId, viewedAt: { [Op.between]: [twoMonthsAgo, monthAgo] } } }),
    Review.findOne({
      attributes: [
        [fn('AVG', col('rating')), 'avgRating'],
        [fn('COUNT', col('Review.id')), 'reviewCount'],
      ],
      include: [{ model: Product, as: 'product', attributes: [], where: { sellerId } }],
      raw: true,
    }) as unknown as Promise<{ avgRating: string | null; reviewCount: string } | null>,
    Wishlist.count({ include: [{ model: Product, as: 'product', attributes: [], where: { sellerId } }] }),
    Wishlist.count({
      include: [{ model: Product, as: 'product', attributes: [], where: { sellerId } }],
      where: { createdAt: { [Op.gte]: monthAgo } },
    }),
    Wishlist.count({
      include: [{ model: Product, as: 'product', attributes: [], where: { sellerId } }],
      where: { createdAt: { [Op.between]: [twoMonthsAgo, monthAgo] } },
    }),
  ]);

  const viewsGrowthPercent = viewsLastMonth === 0
    ? (viewsThisMonth > 0 ? 100 : 0)
    : Math.round(((viewsThisMonth - viewsLastMonth) / viewsLastMonth) * 100);

  const wishlistGrowthPercent = wishlistLastMonth === 0
    ? (wishlistThisMonth > 0 ? 100 : 0)
    : Math.round(((wishlistThisMonth - wishlistLastMonth) / wishlistLastMonth) * 100);

  return {
    totalViews: viewsThisMonth,
    viewsGrowthPercent,
    wishlistSaves,
    wishlistGrowthPercent,
    totalProducts,
    productsAddedThisWeek,
    avgRating: ratingStats?.avgRating ? Math.round(parseFloat(ratingStats.avgRating) * 10) / 10 : 0,
    reviewCount: ratingStats ? parseInt(ratingStats.reviewCount, 10) : 0,
  };
}
