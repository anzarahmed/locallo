import type { Request, Response } from 'express';
import { sendSuccess, handleServiceError } from '../../utils/response';
import { withSignedImages, signModelRows, getPresignedUrl } from '../../utils/imageStorage';
import { parsePagination } from '../../utils/pagination';
import * as productService from '../../services/customer/productService';

interface TrendingProduct {
  id: string;
  title: string;
  image: string | null;
  mrp: number | null;
  sellingPrice: number;
  rating: number;
}

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

export async function getTrendingProducts(_req: Request, res: Response): Promise<void> {
  const rows = await productService.getTrendingProducts();

  const products: TrendingProduct[] = await Promise.all(
    rows.map(async (p) => ({
      id: p.id,
      title: p.name,
      image: p.images[0] ? await getPresignedUrl(p.images[0]) : null,
      mrp: p.mrp,
      sellingPrice: p.sellingPrice,
      rating: 0,
    })),
  );

  sendSuccess(res, { products }, 'Trending products fetched');
}
