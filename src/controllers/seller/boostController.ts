import type { Request, Response } from 'express';
import { sendSuccess, handleServiceError } from '../../utils/response';
import { parsePagination } from '../../utils/pagination';
import * as boostService from '../../services/seller/boostService';
import type { PaymentStatus } from '../../types';

export async function createProductBoost(req: Request, res: Response): Promise<void> {
  try {
    const boost = await boostService.createBoost(req.seller!.id, String(req.params.id), req.body);
    sendSuccess(res, { boost, razorpayKeyId: process.env.RAZORPAY_KEY_ID }, 'Product boosted successfully', 201);
  } catch (err: unknown) {
    handleServiceError(err, res, 'Failed to boost product');
  }
}

export async function getActiveProductBoost(req: Request, res: Response): Promise<void> {
  try {
    const boost = await boostService.getActiveBoost(req.seller!.id, String(req.params.id));
    sendSuccess(res, { boost }, 'Active boost fetched');
  } catch (err: unknown) {
    handleServiceError(err, res, 'Failed to fetch boost');
  }
}

export async function cancelProductBoost(req: Request, res: Response): Promise<void> {
  try {
    await boostService.cancelBoost(req.seller!.id, String(req.params.id));
    sendSuccess(res, {}, 'Boost cancelled');
  } catch (err: unknown) {
    handleServiceError(err, res, 'Failed to cancel boost');
  }
}

export async function getBoostPayments(req: Request, res: Response): Promise<void> {
  const { page, limit } = parsePagination(req);
  const paymentStatus = req.query.paymentStatus ? (String(req.query.paymentStatus) as PaymentStatus) : undefined;
  const { rows, count } = await boostService.getBoosts(req.seller!.id, page, limit, paymentStatus);
  sendSuccess(res, { payments: rows, total: count, page, limit }, 'Payments fetched');
}
