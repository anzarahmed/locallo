import { apiGet } from '../lib/axios';
import { PATHS } from '../api/paths';
import type { ProfileResponse, ProductsResponse } from '../types';

export function getProfile(): Promise<ProfileResponse> {
  return apiGet(PATHS.PROFILE);
}

export function getProducts(params?: {
  page?: number;
  limit?: number;
  isActive?: boolean;
}): Promise<ProductsResponse> {
  return apiGet(PATHS.PRODUCTS, params);
}
