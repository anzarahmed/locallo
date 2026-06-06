import type { Request, Response } from 'express';
import { sendSuccess, sendError } from '../../utils/response';
import { withSignedImages } from '../../utils/imageStorage';
import * as productService from '../../services/admin/productService';

export async function getProducts(req: Request, res: Response): Promise<void> {
  const page       = Math.max(1, Number(req.query.page)  || 1);
  const limit      = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  const sellerId   = req.query.sellerId   ? String(req.query.sellerId)   : undefined;
  const categoryId = req.query.categoryId ? Number(req.query.categoryId) : undefined;
  const search     = req.query.search     ? String(req.query.search)     : undefined;
  const isActive   = req.query.isActive === 'true'
    ? true
    : req.query.isActive === 'false'
    ? false
    : undefined;

  const sortBy    = req.query.sortBy    ? String(req.query.sortBy)    : undefined;
  const sortOrder = req.query.sortOrder === 'asc' ? 'ASC' : 'DESC';

  const { rows, count } = await productService.listAllProducts(
    { sellerId, categoryId, isActive, search, sortBy, sortOrder },
    page,
    limit,
  );
  const products = await Promise.all(
    rows.map(r => withSignedImages(r.toJSON() as Record<string, unknown>)),
  );
  sendSuccess(res, { products, total: count, page, limit }, 'Products fetched');
}

export async function getProduct(req: Request, res: Response): Promise<void> {
  try {
    const product = await productService.getProductById(String(req.params.id));
    const json = product.toJSON() as Record<string, unknown>;
    const signed = await withSignedImages(json);
    if (Array.isArray(signed.variants)) {
      signed.variants = await Promise.all(
        (signed.variants as Record<string, unknown>[]).map(v => withSignedImages(v)),
      );
    }
    sendSuccess(res, { product: signed }, 'Product fetched');
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    sendError(res, e.message ?? 'Product not found', e.status ?? 500);
  }
}

export async function toggleProduct(req: Request, res: Response): Promise<void> {
  try {
    const product = await productService.toggleProduct(String(req.params.id));
    sendSuccess(res, { product }, 'Product status updated');
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    sendError(res, e.message ?? 'Failed to toggle product', e.status ?? 500);
  }
}

export async function deleteProduct(req: Request, res: Response): Promise<void> {
  try {
    await productService.deleteProduct(String(req.params.id));
    sendSuccess(res, null, 'Product deleted');
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    sendError(res, e.message ?? 'Failed to delete product', e.status ?? 500);
  }
}
