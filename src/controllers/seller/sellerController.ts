import type { Request, Response } from 'express';
import { createSeller, getSellerList } from '../../services/seller/sellerService';
import { sendSuccess, sendError } from '../../utils/response';

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

export async function getSellers(req: Request, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const offset = (page - 1) * limit;

    const { sellers, total } = await getSellerList(limit, offset);

    sendSuccess(
      res,
      {
        sellers: sellers.map((user: any) => ({
          id: user.id,
          mobile: user.mobile,
          countryCode: user.countryCode,
          fullName: user.fullName,
          isActive: user.isActive,
          profile: user.SellerProfile ? user.SellerProfile.toJSON() : null,
        })),
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
      200,
    );
  } catch {
    sendError(res, 'Internal server error');
  }
}
