import type { Request, Response } from 'express';
import { sendSuccess, sendError, handleServiceError } from '../../utils/response';
import {
  saveImage, getPresignedUrl, withSignedImages, signModelRows,
  getPresignedUrlOrNull, signImages,
} from '../../utils/imageStorage';
import { parsePagination } from '../../utils/pagination';
import * as productService from '../../services/seller/productService';

export async function uploadImage(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    sendError(res, 'No image file provided', 400);
    return;
  }
  try {
    const key = await saveImage(req.file, req.seller!.id);
    const url = await getPresignedUrl(key);
    sendSuccess(res, { url }, 'Image uploaded', 201);
  } catch (err: unknown) {
    handleServiceError(err, res, 'Failed to upload image');
  }
}

export async function createProduct(req: Request, res: Response): Promise<void> {
  try {
    const product = await productService.createProduct(req.seller!.id, req.body);
    const signed = await withSignedImages(product.toJSON() as Record<string, unknown>);
    sendSuccess(res, { product: signed }, 'Product created', 201);
  } catch (err: unknown) {
    handleServiceError(err, res, 'Failed to create product');
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
  const { page, limit } = parsePagination(req);
  const filter = (VALID_FILTERS.includes(req.query.filter as ProductFilter)
    ? req.query.filter : 'all') as ProductFilter;
  const sortBy = (VALID_SORT_BY.includes(req.query.sortBy as ProductSortBy)
    ? req.query.sortBy : 'sort_newest') as ProductSortBy;

  const { rows, count } = await productService.getSellerProducts(
    req.seller!.id, page, limit, filter, sortBy,
  );
  const products = await signModelRows(rows);
  sendSuccess(res, { products, total: count, page, limit }, 'Products fetched');
}

export async function getProduct(req: Request, res: Response): Promise<void> {
  try {
    const product = await productService.getSellerProduct(req.seller!.id, String(req.params.id));
    const signed = await withSignedImages(product.toJSON() as Record<string, unknown>);
    sendSuccess(res, { product: signed }, 'Product fetched');
  } catch (err: unknown) {
    handleServiceError(err, res, 'Product not found');
  }
}

export async function getProductReviews(req: Request, res: Response): Promise<void> {
  const { page, limit } = parsePagination(req);
  try {
    const { rows, count, avgRating, reviewCount } = await productService.getSellerProductReviews(
      req.seller!.id, String(req.params.id), page, limit,
    );

    const reviews = await Promise.all(rows.map(async (r) => ({
      id: r.id,
      customer: {
        id: r.customer?.id ?? null,
        name: r.customer?.fullName ?? 'Customer',
        image: await getPresignedUrlOrNull(r.customer?.profileImage),
      },
      rating: r.rating,
      review: r.content,
      images: await signImages(r.images),
      createdAt: r.createdAt,
    })));

    sendSuccess(res, {
      reviews,
      total: count,
      page,
      limit,
      summary: { avgRating: Number(avgRating.toFixed(1)), reviewCount },
    }, 'Reviews fetched');
  } catch (err: unknown) {
    handleServiceError(err, res, 'Failed to fetch reviews');
  }
}

export async function updateProduct(req: Request, res: Response): Promise<void> {
  try {
    const product = await productService.updateSellerProduct(req.seller!.id, String(req.params.id), req.body);
    const signed = await withSignedImages(product.toJSON() as Record<string, unknown>);
    sendSuccess(res, { product: signed }, 'Product updated');
  } catch (err: unknown) {
    handleServiceError(err, res, 'Failed to update product');
  }
}

export async function toggleProduct(req: Request, res: Response): Promise<void> {
  try {
    const product = await productService.toggleSellerProduct(req.seller!.id, String(req.params.id));
    sendSuccess(res, { product }, 'Product status updated');
  } catch (err: unknown) {
    handleServiceError(err, res, 'Failed to toggle product');
  }
}

export async function deleteProduct(req: Request, res: Response): Promise<void> {
  try {
    await productService.deleteSellerProduct(req.seller!.id, String(req.params.id));
    sendSuccess(res, null, 'Product deleted');
  } catch (err: unknown) {
    handleServiceError(err, res, 'Failed to delete product');
  }
}
