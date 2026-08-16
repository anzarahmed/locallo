import type { Request, Response } from 'express';
import { getSellerDashboardStats } from '../../services/seller/dashboardService';
import { getTopProducts as getTopProductsService } from '../../services/seller/productService';
import { signModelRows } from '../../utils/imageStorage';
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
    const products = await signModelRows(rows);
    sendSuccess(res, { products });
  } catch {
    sendError(res, 'Failed to load top products', 500);
  }
}
