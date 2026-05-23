import { apiGet, apiPatch, apiDelete } from '../lib/axios';
import { PATHS } from '../api/paths';
import type { Product } from '../types';

interface GetProductsParams {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: number;
  isActive?: boolean;
}

interface GetProductsResponse {
  products: Product[];
  total: number;
  page: number;
  limit: number;
}

export function getProducts(params: GetProductsParams = {}): Promise<GetProductsResponse> {
  const q = new URLSearchParams();
  if (params.page)       q.set('page',       String(params.page));
  if (params.limit)      q.set('limit',      String(params.limit));
  if (params.search)     q.set('search',     params.search);
  if (params.categoryId) q.set('categoryId', String(params.categoryId));
  if (params.isActive !== undefined) q.set('isActive', String(params.isActive));
  const url = q.toString() ? `${PATHS.PRODUCTS.LIST}?${q}` : PATHS.PRODUCTS.LIST;
  return apiGet<GetProductsResponse>(url);
}

export function getProduct(id: number): Promise<Product> {
  return apiGet<{ product: Product }>(PATHS.PRODUCTS.BY_ID(id)).then(r => r.product);
}

export function toggleProduct(id: number): Promise<Product> {
  return apiPatch<{ product: Product }>(PATHS.PRODUCTS.TOGGLE(id)).then(r => r.product);
}

export function deleteProduct(id: number): Promise<void> {
  return apiDelete<null>(PATHS.PRODUCTS.BY_ID(id)).then(() => undefined);
}
