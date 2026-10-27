import type { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { parsePagination } from '../../utils/pagination';
import * as productLimitService from '../../services/seller/productLimitService';

export async function getProductLimits(req: Request, res: Response): Promise<void> {
  const limits = await productLimitService.getSellerLimits(req.seller!.id);
  sendSuccess(res, { limits }, 'Product limits fetched');
}

export async function getProductLimitLogs(req: Request, res: Response): Promise<void> {
  const { page, limit } = parsePagination(req);
  const categoryId = Number(req.query.categoryId);
  const { rows, count } = await productLimitService.listLimitLogs(
    req.seller!.id, page, limit, Number.isInteger(categoryId) && categoryId > 0 ? categoryId : undefined,
  );
  sendSuccess(res, { logs: rows, total: count, page, limit }, 'Product limit logs fetched');
}
