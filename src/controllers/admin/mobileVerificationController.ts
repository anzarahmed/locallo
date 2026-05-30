import type { Request, Response } from 'express';
import { requestAdminMobileOtp, verifyAdminMobileOtp } from '../../services/admin/mobileVerificationService';
import { sendSuccess, sendError } from '../../utils/response';

export async function requestOtp(req: Request, res: Response): Promise<void> {
  try {
    const { countryCode, mobile } = req.body as { countryCode: string; mobile: string };
    const { otp } = await requestAdminMobileOtp(countryCode, mobile);
    sendSuccess(res, { otp }, 'OTP sent successfully');
  } catch (err: unknown) {
    const msg = (err as Error).message;
    if (msg?.startsWith('MSG91:')) {
      sendError(res, msg, 502);
      return;
    }
    console.error('[admin requestOtp]', err);
    sendError(res, 'Failed to send OTP');
  }
}

export async function verifyOtp(req: Request, res: Response): Promise<void> {
  try {
    const { countryCode, mobile, otp } = req.body as { countryCode: string; mobile: string; otp: string };
    verifyAdminMobileOtp(countryCode, mobile, otp);
    sendSuccess(res, { verified: true }, 'Mobile number verified');
  } catch (err: unknown) {
    const status = (err as { status?: number }).status;
    if (status === 410) {
      sendError(res, (err as Error).message, 410);
      return;
    }
    if (status === 422) {
      sendError(res, (err as Error).message, 422);
      return;
    }
    sendError(res, 'Verification failed');
  }
}
