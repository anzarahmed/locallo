import type { Request, Response } from 'express';
import { requestSellerOtp, verifySellerOtp, logoutSeller } from '../../services/seller/sellerAuthService';
import { sendSuccess, sendError, handleServiceError } from '../../utils/response';

export async function requestOtp(req: Request, res: Response): Promise<void> {
  try {
    const { otp } = await requestSellerOtp(req.body);
    sendSuccess(res, { otp }, 'OTP sent successfully');
  } catch (err: unknown) {
    const msg = (err as Error).message;
    if (msg?.startsWith('MSG91:')) {
      console.error('[requestOtp seller]', err);
      sendError(res, msg, 502);
      return;
    }
    handleServiceError(err, res);
  }
}

export async function logout(req: Request, res: Response): Promise<void> {
  try {
    const token = req.headers.authorization!.slice(7);
    await logoutSeller(token);
    sendSuccess(res, null, 'Logged out successfully');
  } catch {
    sendError(res, 'Internal server error');
  }
}

export async function verifyOtp(req: Request, res: Response): Promise<void> {
  try {
    const result = await verifySellerOtp(req.body);
    sendSuccess(res, result, 'OTP verified successfully');
  } catch (err: unknown) {
    handleServiceError(err, res);
  }
}
