import type { Request, Response } from 'express';
import { sendSuccess, handleServiceError } from '../../utils/response';
import { getPresignedUrlOrNull } from '../../utils/imageStorage';
import * as sellerService from '../../services/customer/sellerService';

export async function getSellerWorkingHours(req: Request, res: Response): Promise<void> {
  try {
    const result = await sellerService.getTodayWorkingHours(String(req.params.id));
    sendSuccess(res, result, 'Working hours fetched');
  } catch (err: unknown) {
    handleServiceError(err, res, 'Seller not found');
  }
}

export async function getSellerDetails(req: Request, res: Response): Promise<void> {
  try {
    const seller = await sellerService.getSellerDetails(String(req.params.id));
    seller.photo = await getPresignedUrlOrNull(seller.photo);
    sendSuccess(res, seller, 'Seller fetched');
  } catch (err: unknown) {
    handleServiceError(err, res, 'Seller not found');
  }
}
