import type { Request, Response } from 'express';
import { sendSuccess, sendError } from '../../utils/response';
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

  const { rows, count } = await productService.listAllProducts(
    { sellerId, categoryId, isActive, search },
    page,
    limit,
  );
  sendSuccess(res, { products: rows, total: count, page, limit });
}

export async function getProduct(req: Request, res: Response): Promise<void> {
  try {
    const product = await productService.getProductById(Number(req.params.id));
    sendSuccess(res, { product });
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    sendError(res, e.message ?? 'Product not found', e.status ?? 500);
  }
}

export async function toggleProduct(req: Request, res: Response): Promise<void> {
  try {
    const product = await productService.toggleProduct(Number(req.params.id));
    sendSuccess(res, { product });
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    sendError(res, e.message ?? 'Failed to toggle product', e.status ?? 500);
  }
}

export async function deleteProduct(req: Request, res: Response): Promise<void> {
  try {
    await productService.deleteProduct(Number(req.params.id));
    sendSuccess(res, null);
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    sendError(res, e.message ?? 'Failed to delete product', e.status ?? 500);
  }
}
