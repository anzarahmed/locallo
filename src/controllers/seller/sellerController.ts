import type { Request, Response } from 'express';
import { createSeller, getSellerList, getSellerById, adminUpdateSeller, updateSellerProfile, updateSellerAddress } from '../../services/seller/sellerService';
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

export async function updateSeller(req: Request, res: Response): Promise<void> {
  try {
    const { user, profile } = await updateSellerProfile(req.seller!.id, req.body);
    sendSuccess(res, {
      id: user.id,
      mobile: user.mobile,
      countryCode: user.countryCode,
      fullName: user.fullName,
      isActive: user.isActive,
      profile: profile.toJSON(),
    });
  } catch (err: unknown) {
    const status = (err as { status?: number }).status;
    if (status === 404) {
      sendError(res, (err as Error).message, 404);
      return;
    }
    sendError(res, 'Internal server error');
  }
}

export async function updateAddress(req: Request, res: Response): Promise<void> {
  try {
    const profile = await updateSellerAddress(req.seller!.id, req.body);
    sendSuccess(res, { profile: profile.toJSON() });
  } catch (err: unknown) {
    if ((err as { status?: number }).status === 404) {
      sendError(res, (err as Error).message, 404);
      return;
    }
    sendError(res, 'Internal server error');
  }
}

export async function adminEditSeller(req: Request, res: Response): Promise<void> {
  try {
    const { user, profile } = await adminUpdateSeller(req.params.id as string, req.body);
    sendSuccess(res, {
      id: user.id,
      mobile: user.mobile,
      countryCode: user.countryCode,
      fullName: user.fullName,
      isActive: user.isActive,
      profile: profile.toJSON(),
    });
  } catch (err: unknown) {
    const status = (err as { status?: number }).status;
    if (status === 404) {
      sendError(res, (err as Error).message, 404);
      return;
    }
    if (status === 409) {
      sendError(res, (err as Error).message, 409);
      return;
    }
    sendError(res, 'Internal server error');
  }
}

export async function getSeller(req: Request, res: Response): Promise<void> {
  try {
    const { user, profile } = await getSellerById(req.params.id as string);
    sendSuccess(res, {
      id: user.id,
      mobile: user.mobile,
      countryCode: user.countryCode,
      fullName: user.fullName,
      isActive: user.isActive,
      profile: profile.toJSON(),
    });
  } catch (err: unknown) {
    if ((err as { status?: number }).status === 404) {
      sendError(res, (err as Error).message, 404);
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
