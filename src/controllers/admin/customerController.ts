import type { Request, Response } from 'express';
import { sendSuccess, handleServiceError } from '../../utils/response';
import { parsePagination } from '../../utils/pagination';
import { withSignedImages } from '../../utils/imageStorage';
import * as customerService from '../../services/admin/customerService';

export async function getCustomers(req: Request, res: Response): Promise<void> {
  const { page, limit } = parsePagination(req);
  const search = req.query.search ? String(req.query.search) : undefined;
  const isVerified = req.query.isVerified === 'true'
    ? true
    : req.query.isVerified === 'false'
    ? false
    : undefined;
  const isActive = req.query.isActive === 'true'
    ? true
    : req.query.isActive === 'false'
    ? false
    : undefined;

  const sortBy    = req.query.sortBy    ? String(req.query.sortBy)    : undefined;
  const sortOrder = req.query.sortOrder === 'asc' ? 'ASC' : 'DESC';

  const { rows, count } = await customerService.listCustomers(
    { search, isVerified, isActive, sortBy, sortOrder },
    page,
    limit,
  );

  sendSuccess(
    res,
    {
      customers: rows.map(u => ({
        id: u.id,
        mobile: u.mobile,
        countryCode: u.countryCode,
        fullName: u.fullName,
        isVerified: u.isVerified,
        isActive: u.isActive,
        createdAt: u.createdAt,
        wishlistCount: Number(u.get('wishlistCount')),
      })),
      total: count,
      page,
      limit,
    },
    'Customers fetched',
  );
}

export async function getCustomer(req: Request, res: Response): Promise<void> {
  try {
    const { customer, wishlist, wishlistTotal } = await customerService.getCustomerById(String(req.params.id));

    const wishlistItems = await Promise.all(
      wishlist.map(async (w) => ({
        id: w.id,
        createdAt: w.createdAt,
        product: await withSignedImages(w.product.toJSON() as Record<string, unknown>),
      })),
    );

    sendSuccess(
      res,
      {
        id: customer.id,
        mobile: customer.mobile,
        countryCode: customer.countryCode,
        fullName: customer.fullName,
        isVerified: customer.isVerified,
        isActive: customer.isActive,
        createdAt: customer.createdAt,
        wishlist: wishlistItems,
        wishlistTotal,
      },
      'Customer fetched',
    );
  } catch (err: unknown) {
    handleServiceError(err, res, 'Customer not found');
  }
}

export async function patchCustomerStatus(req: Request, res: Response): Promise<void> {
  try {
    const customer = await customerService.toggleCustomerStatus(String(req.params.id));
    sendSuccess(res, { id: customer.id, isActive: customer.isActive }, 'Status updated');
  } catch (err: unknown) {
    handleServiceError(err, res, 'Failed to toggle customer status');
  }
}
