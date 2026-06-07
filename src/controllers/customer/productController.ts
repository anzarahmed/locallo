import type { Request, Response } from 'express';
import { sendSuccess, handleServiceError } from '../../utils/response';
import { withSignedImages, signModelRows } from '../../utils/imageStorage';
import { parsePagination } from '../../utils/pagination';
import * as productService from '../../services/customer/productService';

export async function getProducts(req: Request, res: Response): Promise<void> {
  const { page, limit } = parsePagination(req);
  const categoryId = req.query.categoryId ? Number(req.query.categoryId) : undefined;
  const search     = req.query.search     ? String(req.query.search)     : undefined;

  const { rows, count } = await productService.browseProducts({ categoryId, search }, page, limit);
  const products = await signModelRows(rows);
  sendSuccess(res, { products, total: count, page, limit }, 'Products fetched');
}

export async function getProduct(req: Request, res: Response): Promise<void> {
  try {
    const product = await productService.getProductDetail(String(req.params.id));
    const signed = await withSignedImages(product.toJSON() as Record<string, unknown>);
    sendSuccess(res, { product: signed }, 'Product fetched');
  } catch (err: unknown) {
    handleServiceError(err, res, 'Product not found');
  }
}
