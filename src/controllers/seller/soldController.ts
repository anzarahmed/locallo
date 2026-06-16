import type { Request, Response } from 'express';
import { sendSuccess, handleServiceError } from '../../utils/response';
import { parsePagination } from '../../utils/pagination';
import * as soldService from '../../services/seller/soldService';

export async function markProductSold(req: Request, res: Response): Promise<void> {
  try {
    const log = await soldService.markProductSold(
      req.seller!.id,
      String(req.params.id),
      Number(req.body.quantity),
    );
    sendSuccess(res, { log }, 'Sale recorded');
  } catch (err: unknown) {
    handleServiceError(err, res, 'Failed to record sale');
  }
}

export async function markVariantSold(req: Request, res: Response): Promise<void> {
  try {
    const log = await soldService.markVariantSold(
      req.seller!.id,
      String(req.params.id),
      String(req.params.variantId),
      Number(req.body.quantity),
    );
    sendSuccess(res, { log }, 'Sale recorded');
  } catch (err: unknown) {
    handleServiceError(err, res, 'Failed to record sale');
  }
}

export async function getSoldLogs(req: Request, res: Response): Promise<void> {
  const { page, limit } = parsePagination(req);
  const from = typeof req.query.from === 'string' ? req.query.from : undefined;
  const to   = typeof req.query.to   === 'string' ? req.query.to   : undefined;

  const { rows, count } = await soldService.getSoldLogs(
    req.seller!.id, page, limit, from, to,
  );
  sendSuccess(res, { logs: rows, total: count, page, limit }, 'Sold logs fetched');
}
