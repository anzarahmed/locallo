import type { Request, Response } from 'express';
import { sendSuccess, sendError } from '../../utils/response';
import { saveImage } from '../../utils/imageStorage';
import * as productService from '../../services/seller/productService';

export async function uploadImage(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    sendError(res, 'No image file provided', 400);
    return;
  }
  const url = saveImage(req.file, req.seller!.id);
  sendSuccess(res, { url }, 201);
}

export async function createProduct(req: Request, res: Response): Promise<void> {
  try {
  const product = await productService.createProduct(req.seller!.id, req.body);
    sendSuccess(res, { product }, 201);
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    sendError(res, e.message ?? 'Failed to create product', e.status ?? 500);
  }
}

export async function getProducts(req: Request, res: Response): Promise<void> {
  const page  = Math.max(1, Number(req.query.page)  || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  const isActive = req.query.isActive === 'true'
    ? true
    : req.query.isActive === 'false'
    ? false
    : undefined;

  const { rows, count } = await productService.getSellerProducts(req.seller!.id, page, limit, isActive);
  sendSuccess(res, { products: rows, total: count, page, limit });
}

export async function getProduct(req: Request, res: Response): Promise<void> {
  try {
    const product = await productService.getSellerProduct(req.seller!.id, Number(req.params.id));
    sendSuccess(res, { product });
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    sendError(res, e.message ?? 'Product not found', e.status ?? 500);
  }
}

export async function updateProduct(req: Request, res: Response): Promise<void> {
  try {
    const product = await productService.updateSellerProduct(req.seller!.id, Number(req.params.id), req.body);
    sendSuccess(res, { product });
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    sendError(res, e.message ?? 'Failed to update product', e.status ?? 500);
  }
}

export async function toggleProduct(req: Request, res: Response): Promise<void> {
  try {
    const product = await productService.toggleSellerProduct(req.seller!.id, Number(req.params.id));
    sendSuccess(res, { product });
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    sendError(res, e.message ?? 'Failed to toggle product', e.status ?? 500);
  }
}

export async function deleteProduct(req: Request, res: Response): Promise<void> {
  try {
    await productService.deleteSellerProduct(req.seller!.id, Number(req.params.id));
    sendSuccess(res, null);
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    sendError(res, e.message ?? 'Failed to delete product', e.status ?? 500);
  }
}
