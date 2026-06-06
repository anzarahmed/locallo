import type { Request, Response } from 'express';
import { sendSuccess, sendError } from '../../utils/response';
import { saveImage } from '../../utils/imageStorage';
import * as productService from '../../services/seller/productService';

export async function uploadImage(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    sendError(res, 'No image file provided', 400);
    return;
  }
  try {
    const url = await saveImage(req.file, req.seller!.id);
    sendSuccess(res, { url }, 'Image uploaded', 201);
  } catch (err: unknown) {
    const e = err as { message?: string };
    sendError(res, e.message ?? 'Failed to upload image', 500);
  }
}

export async function createProduct(req: Request, res: Response): Promise<void> {
  try {
    const product = await productService.createProduct(req.seller!.id, req.body);
    sendSuccess(res, { product }, 'Product created', 201);
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    sendError(res, e.message ?? 'Failed to create product', e.status ?? 500);
  }
}

const VALID_FILTERS  = ['all', 'visible', 'hidden'] as const;
const VALID_SORT_BY  = [
  'sort_newest', 'sort_price_high_low', 'sort_price_low_high',
  'sort_most_wishlisted', 'sort_top_rated',
  'sort_stock_high_low', 'sort_stock_low_high',
  'sort_visible_first', 'sort_hidden_first', 'sort_name_az',
] as const;

type ProductFilter = typeof VALID_FILTERS[number];
type ProductSortBy = typeof VALID_SORT_BY[number];

export async function getProducts(req: Request, res: Response): Promise<void> {
  const page   = Math.max(1, Number(req.query.page) || 1);
  const limit  = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  const filter = (VALID_FILTERS.includes(req.query.filter as ProductFilter)
    ? req.query.filter : 'all') as ProductFilter;
  const sortBy = (VALID_SORT_BY.includes(req.query.sortBy as ProductSortBy)
    ? req.query.sortBy : 'sort_newest') as ProductSortBy;

  const { rows, count } = await productService.getSellerProducts(
    req.seller!.id, page, limit, filter, sortBy,
  );
  sendSuccess(res, { products: rows, total: count, page, limit }, 'Products fetched');
}

export async function getProduct(req: Request, res: Response): Promise<void> {
  try {
    const product = await productService.getSellerProduct(req.seller!.id, String(req.params.id));
    sendSuccess(res, { product }, 'Product fetched');
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    sendError(res, e.message ?? 'Product not found', e.status ?? 500);
  }
}

export async function updateProduct(req: Request, res: Response): Promise<void> {
  try {
    const product = await productService.updateSellerProduct(req.seller!.id, String(req.params.id), req.body);
    sendSuccess(res, { product }, 'Product updated');
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    sendError(res, e.message ?? 'Failed to update product', e.status ?? 500);
  }
}

export async function toggleProduct(req: Request, res: Response): Promise<void> {
  try {
    const product = await productService.toggleSellerProduct(req.seller!.id, String(req.params.id));
    sendSuccess(res, { product }, 'Product status updated');
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    sendError(res, e.message ?? 'Failed to toggle product', e.status ?? 500);
  }
}

export async function deleteProduct(req: Request, res: Response): Promise<void> {
  try {
    await productService.deleteSellerProduct(req.seller!.id, String(req.params.id));
    sendSuccess(res, null, 'Product deleted');
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    sendError(res, e.message ?? 'Failed to delete product', e.status ?? 500);
  }
}
