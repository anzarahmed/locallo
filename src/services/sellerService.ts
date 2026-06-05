import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from '../lib/axios';
import { PATHS } from '../api/paths';
import type { ProfileResponse, ProductsResponse, SellerCategory, Product, ImageAnalysisResult, ProductVariant } from '../types';

export function getProfile(): Promise<ProfileResponse> {
  return apiGet(PATHS.PROFILE);
}

export function updateProfile(data: Record<string, unknown>): Promise<ProfileResponse> {
  return apiPut(PATHS.PROFILE, data);
}

export function updateAddress(data: { address: string; lat: number; long: number }): Promise<unknown> {
  return apiPut(PATHS.ADDRESS, data);
}

export function getCategories(): Promise<{ categories: SellerCategory[] }> {
  return apiGet(PATHS.CATEGORIES);
}

export function getProducts(params?: {
  page?: number;
  limit?: number;
  filter?: 'all' | 'visible' | 'hidden';
  sortBy?: string;
}): Promise<ProductsResponse> {
  return apiGet(PATHS.PRODUCTS, params);
}

export function toggleProduct(id: string): Promise<unknown> {
  return apiPatch(`${PATHS.PRODUCTS}/${id}/toggle`);
}

export function deleteProduct(id: string): Promise<unknown> {
  return apiDelete(`${PATHS.PRODUCTS}/${id}`);
}

export function uploadProductImage(file: File): Promise<{ url: string }> {
  const form = new FormData();
  form.append('image', file);
  return apiPost<{ url: string }>(PATHS.UPLOAD_IMAGE, form);
}

export function analyzeProductImage(file: File): Promise<ImageAnalysisResult> {
  const form = new FormData();
  form.append('image', file);
  return apiPost<ImageAnalysisResult>(PATHS.ANALYZE_IMAGE, form);
}

export function createProduct(data: Record<string, unknown>): Promise<{ product: Product }> {
  return apiPost<{ product: Product }>(PATHS.PRODUCTS, data);
}

export function getSellerProduct(id: string): Promise<{ product: Product }> {
  return apiGet<{ product: Product }>(`${PATHS.PRODUCTS}/${id}`);
}

export function updateProduct(id: string, data: Record<string, unknown>): Promise<{ product: Product }> {
  return apiPut<{ product: Product }>(`${PATHS.PRODUCTS}/${id}`, data);
}

export function getProductVariants(productId: string): Promise<{ product: Product; variants: ProductVariant[] }> {
  return apiGet(`${PATHS.PRODUCTS}/${productId}/variants`);
}

export function createVariant(productId: string, data: Record<string, unknown>): Promise<{ variant: ProductVariant }> {
  return apiPost(`${PATHS.PRODUCTS}/${productId}/variants`, data);
}

export function updateVariant(productId: string, variantId: string, data: Record<string, unknown>): Promise<{ variant: ProductVariant }> {
  return apiPut(`${PATHS.PRODUCTS}/${productId}/variants/${variantId}`, data);
}

export function deleteVariant(productId: string, variantId: string): Promise<unknown> {
  return apiDelete(`${PATHS.PRODUCTS}/${productId}/variants/${variantId}`);
}

export function toggleVariant(productId: string, variantId: string): Promise<{ variant: ProductVariant }> {
  return apiPatch(`${PATHS.PRODUCTS}/${productId}/variants/${variantId}/toggle`);
}
