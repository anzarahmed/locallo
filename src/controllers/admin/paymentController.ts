import type { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { parsePagination } from '../../utils/pagination';
import * as paymentService from '../../services/admin/paymentService';
import type { BoostStatus, PaymentStatus } from '../../types';

export async function getPayments(req: Request, res: Response): Promise<void> {
  const { page, limit } = parsePagination(req);
  const sellerId      = req.query.sellerId      ? String(req.query.sellerId)                    : undefined;
  const paymentStatus = req.query.paymentStatus ? (String(req.query.paymentStatus) as PaymentStatus) : undefined;
  const status        = req.query.status        ? (String(req.query.status) as BoostStatus)        : undefined;
  const search         = req.query.search        ? String(req.query.search)                        : undefined;
  const sortBy    = req.query.sortBy    ? String(req.query.sortBy) : undefined;
  const sortOrder = req.query.sortOrder === 'asc' ? 'ASC' : 'DESC';

  const { rows, count } = await paymentService.listAllPayments(
    { sellerId, paymentStatus, status, search, sortBy, sortOrder },
    page,
    limit,
  );
  sendSuccess(res, { payments: rows, total: count, page, limit }, 'Payments fetched');
}
