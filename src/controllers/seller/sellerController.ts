import type { Request, Response } from 'express';
import { createSeller, getSellerList, getSellerById, adminUpdateSeller, updateSellerProfile, updateSellerAddress, toggleSellerStatus } from '../../services/seller/sellerService';
import { sendSuccess, sendError } from '../../utils/response';

export async function getProfile(req: Request, res: Response): Promise<void> {
  try {
    const { user, profile } = await getSellerById(req.seller!.id);
    sendSuccess(res, {
      id: user.id,
      mobile: user.mobile,
      countryCode: user.countryCode,
      fullName: user.fullName,
      isActive: user.isActive,
      profile: profile.toJSON(),
    }, 'Profile fetched');
  } catch (err: unknown) {
    if ((err as { status?: number }).status === 404) {
      sendError(res, (err as Error).message, 404);
      return;
    }
    sendError(res, 'Internal server error');
  }
}

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
      'Seller created',
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
    }, 'Profile updated');
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
    sendSuccess(res, { profile: profile.toJSON() }, 'Address updated');
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
    }, 'Seller updated');
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
    }, 'Seller fetched');
  } catch (err: unknown) {
    if ((err as { status?: number }).status === 404) {
      sendError(res, (err as Error).message, 404);
      return;
    }
    sendError(res, 'Internal server error');
  }
}

export async function patchSellerStatus(req: Request, res: Response): Promise<void> {
  try {
    const user = await toggleSellerStatus(req.params.id as string);
    sendSuccess(res, { id: user.id, isActive: user.isActive }, 'Status updated');
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
    const page  = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 10));
    const offset = (page - 1) * limit;

    const sortBy    = req.query.sortBy    ? String(req.query.sortBy)    : 'createdAt';
    const sortOrder = req.query.sortOrder === 'desc' ? 'DESC' : 'ASC';
    const isActive  = req.query.isActive === 'true'
      ? true
      : req.query.isActive === 'false'
      ? false
      : undefined;
    const categoryId    = req.query.categoryId    ? Number(req.query.categoryId)    : undefined;
    const fullName      = req.query.fullName      ? String(req.query.fullName)      : undefined;
    const businessName  = req.query.businessName  ? String(req.query.businessName)  : undefined;
    const mobile        = req.query.mobile        ? String(req.query.mobile)        : undefined;

    const { sellers, total } = await getSellerList(limit, offset, {
      sortBy, sortOrder, isActive, categoryId, fullName, businessName, mobile,
    });

    sendSuccess(
      res,
      {
        sellers: sellers.map((user) => ({
          id: user.id,
          mobile: user.mobile,
          countryCode: user.countryCode,
          fullName: user.fullName,
          businessName: user.sellerProfile?.businessName ?? null,
          email: user.sellerProfile?.email ?? null,
          isActive: user.isActive,
          profile: user.sellerProfile ? user.sellerProfile.toJSON() : null,
        })),
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
      'Sellers fetched',
    );
  } catch {
    sendError(res, 'Internal server error');
  }
}
