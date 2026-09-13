import type { Request, Response } from 'express';
import { sendSuccess, handleServiceError } from '../../utils/response';
import * as dashboardService from '../../services/admin/dashboardService';

const DEFAULT_ACTIVITY_LIMIT = 5;
const MAX_ACTIVITY_LIMIT = 50;

export async function getRecentActivity(req: Request, res: Response): Promise<void> {
  try {
    const requested = Number(req.query.limit);
    const limit = Number.isFinite(requested) && requested > 0
      ? Math.min(Math.floor(requested), MAX_ACTIVITY_LIMIT)
      : DEFAULT_ACTIVITY_LIMIT;

    const activities = await dashboardService.getRecentActivity(limit);
    sendSuccess(res, { activities }, 'Recent activity fetched');
  } catch (err: unknown) {
    handleServiceError(err, res, 'Failed to fetch recent activity');
  }
}
