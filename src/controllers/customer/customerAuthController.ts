import type { Request, Response } from 'express';
import { requestCustomerOtp, verifyCustomerOtp } from '../../services/customer/customerAuthService';
import { sendSuccess, sendError } from '../../utils/response';

export async function requestOtp(req: Request, res: Response): Promise<void> {
  try {
    const { otp } = await requestCustomerOtp(req.body);
    sendSuccess(res, { otp }, 'OTP sent successfully');
  } catch (err: unknown) {
    const status = (err as { status?: number }).status;
    if (status === 403) {
      sendError(res, (err as Error).message, 403);
      return;
    }
    console.error('[requestOtp customer]', err);
    const msg = (err as Error).message;
    if (msg?.startsWith('MSG91:')) {
      sendError(res, msg, 502);
      return;
    }
    sendError(res, 'Internal server error');
  }
}

export async function verifyOtp(req: Request, res: Response): Promise<void> {
  try {
    const result = await verifyCustomerOtp(req.body);
    sendSuccess(res, result, 'OTP verified successfully');
  } catch (err: unknown) {
    const status = (err as { status?: number }).status;
    if (status === 404) {
      sendError(res, (err as Error).message, 404);
      return;
    }
    if (status === 403) {
      sendError(res, (err as Error).message, 403);
      return;
    }
    if (status === 410) {
      sendError(res, (err as Error).message, 410);
      return;
    }
    if (status === 422) {
      sendError(res, (err as Error).message, 422);
      return;
    }
    sendError(res, 'Internal server error');
  }
}
