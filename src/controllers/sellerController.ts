import type { Request, Response } from 'express';
import { createSeller } from '../services/sellerService';
import { sendSuccess, sendError } from '../utils/response';

export async function addSeller(req: Request, res: Response): Promise<void> {
  try {
    const { user, profile } = await createSeller(req.body, req.admin!.id);
    sendSuccess(
      res,
      {
        id: user.id,
        mobile: user.mobile,
        countryCode: user.countryCode,
        fullName: user.fullName,
        isActive: user.isActive,
        profile: profile.toJSON(),
      },
      201,
    );
  } catch (err: unknown) {
    if ((err as { status?: number }).status === 409) {
      sendError(res, (err as Error).message, 409);
      return;
    }
    sendError(res, 'Internal server error');
  }
}
