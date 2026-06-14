import type { Request, Response } from 'express';
import { getSellerDashboardStats } from '../../services/seller/dashboardService';
import { sendSuccess, sendError } from '../../utils/response';

export async function getDashboardStats(req: Request, res: Response): Promise<void> {
  try {
    const stats = await getSellerDashboardStats(req.seller!.id);
    sendSuccess(res, stats);
  } catch {
    sendError(res, 'Failed to load dashboard stats', 500);
  }
}
