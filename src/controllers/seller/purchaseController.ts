import type { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { parsePagination } from '../../utils/pagination';
import * as purchaseService from '../../services/seller/purchaseService';

export async function getPurchaseLogs(req: Request, res: Response): Promise<void> {
  const { page, limit } = parsePagination(req);
  const from = typeof req.query.from === 'string' ? req.query.from : undefined;
  const to   = typeof req.query.to   === 'string' ? req.query.to   : undefined;

  const { rows, count } = await purchaseService.getPurchaseLogs(
    req.seller!.id, page, limit, from, to,
  );
  sendSuccess(res, { logs: rows, total: count, page, limit }, 'Purchase logs fetched');
}
