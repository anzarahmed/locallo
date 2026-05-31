import { apiGet, apiPut } from '../lib/axios';
import { PATHS } from '../api/paths';
import type { ProfileResponse, ProductsResponse, SellerCategory } from '../types';

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
  isActive?: boolean;
}): Promise<ProductsResponse> {
  return apiGet(PATHS.PRODUCTS, params);
}
