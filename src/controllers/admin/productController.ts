import type { Request, Response } from 'express';
import { sendSuccess, handleServiceError } from '../../utils/response';
import { withSignedImages, signModelRows } from '../../utils/imageStorage';
import { parsePagination } from '../../utils/pagination';
import * as productService from '../../services/admin/productService';

export async function getProducts(req: Request, res: Response): Promise<void> {
  const { page, limit } = parsePagination(req);
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
  const products = await signModelRows(rows);
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
    handleServiceError(err, res, 'Product not found');
  }
}

export async function toggleProduct(req: Request, res: Response): Promise<void> {
  try {
    const product = await productService.toggleProduct(String(req.params.id));
    sendSuccess(res, { product }, 'Product status updated');
  } catch (err: unknown) {
    handleServiceError(err, res, 'Failed to toggle product');
  }
}

export async function deleteProduct(req: Request, res: Response): Promise<void> {
  try {
    await productService.deleteProduct(String(req.params.id));
    sendSuccess(res, null, 'Product deleted');
  } catch (err: unknown) {
    handleServiceError(err, res, 'Failed to delete product');
  }
}
