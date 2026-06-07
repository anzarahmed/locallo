import type { Request, Response } from 'express';
import { requestCustomerOtp, verifyCustomerOtp } from '../../services/customer/customerAuthService';
import { sendSuccess, sendError, handleServiceError } from '../../utils/response';

export async function requestOtp(req: Request, res: Response): Promise<void> {
  try {
    const { otp } = await requestCustomerOtp(req.body);
    sendSuccess(res, { otp }, 'OTP sent successfully');
  } catch (err: unknown) {
    const msg = (err as Error).message;
    if (msg?.startsWith('MSG91:')) {
      console.error('[requestOtp customer]', err);
      sendError(res, msg, 502);
      return;
    }
    handleServiceError(err, res);
  }
}

export async function verifyOtp(req: Request, res: Response): Promise<void> {
  try {
    const result = await verifyCustomerOtp(req.body);
    sendSuccess(res, result, 'OTP verified successfully');
  } catch (err: unknown) {
    handleServiceError(err, res);
  }
}
