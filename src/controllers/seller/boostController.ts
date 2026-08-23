import type { Request, Response } from 'express';
import { sendSuccess, handleServiceError } from '../../utils/response';
import * as boostService from '../../services/seller/boostService';

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
