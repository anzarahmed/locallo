import type { Request, Response } from 'express';
import { getSellerDashboardStats } from '../../services/seller/dashboardService';
import { getTopProducts as getTopProductsService } from '../../services/seller/productService';
import { getPresignedUrlOrNull, toThumbnailKey } from '../../utils/imageStorage';
import { sendSuccess, sendError } from '../../utils/response';

const TOP_PRODUCTS_LIMIT = 5;

export async function getDashboardStats(req: Request, res: Response): Promise<void> {
  try {
    const stats = await getSellerDashboardStats(req.seller!.id);
    sendSuccess(res, stats);
  } catch {
    sendError(res, 'Failed to load dashboard stats', 500);
  }
}

export async function getTopProducts(req: Request, res: Response): Promise<void> {
  try {
    const rows = await getTopProductsService(req.seller!.id, TOP_PRODUCTS_LIMIT);
    const products = await Promise.all(rows.map(async (row) => {
      const images = row.images ?? [];
      return {
        id: row.id,
        title: row.name,
        image: images.length > 0 ? await getPresignedUrlOrNull(toThumbnailKey(images[0])) : null,
        totalStock: row.stock,
        isActive: row.isActive,
      };
    }));
    sendSuccess(res, { products });
  } catch {
    sendError(res, 'Failed to load top products', 500);
  }
}
