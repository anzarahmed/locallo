import type { Request, Response } from 'express';
import { sendSuccess, sendError } from '../../utils/response';
import { withSignedImages } from '../../utils/imageStorage';
import * as productService from '../../services/customer/productService';

export async function getProducts(req: Request, res: Response): Promise<void> {
  const page       = Math.max(1, Number(req.query.page)  || 1);
  const limit      = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  const categoryId = req.query.categoryId ? Number(req.query.categoryId) : undefined;
  const search     = req.query.search     ? String(req.query.search)     : undefined;

  const { rows, count } = await productService.browseProducts({ categoryId, search }, page, limit);
  const products = await Promise.all(
    rows.map(r => withSignedImages(r.toJSON() as Record<string, unknown>)),
  );
  sendSuccess(res, { products, total: count, page, limit }, 'Products fetched');
}

export async function getProduct(req: Request, res: Response): Promise<void> {
  try {
    const product = await productService.getProductDetail(String(req.params.id));
    const signed = await withSignedImages(product.toJSON() as Record<string, unknown>);
    sendSuccess(res, { product: signed }, 'Product fetched');
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    sendError(res, e.message ?? 'Product not found', e.status ?? 500);
  }
}
