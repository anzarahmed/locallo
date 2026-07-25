import { apiGet, apiPost, apiPut, apiDelete } from '../lib/axios';
import { PATHS } from '../api/paths';
import type { Brand } from '../types';

export interface GetBrandsPaginatedParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface GetBrandsPaginatedResponse {
  brands: Brand[];
  total: number;
  page: number;
  limit: number;
}

interface BrandPayload {
  name: string;
  slug: string;
  logo?: string | null;
}

interface UpdateBrandPayload {
  name?: string;
  slug?: string;
  isActive?: boolean;
  logo?: string | null;
}

export function getBrandsPaginated(
  params: GetBrandsPaginatedParams = {},
): Promise<GetBrandsPaginatedResponse> {
  const q = new URLSearchParams();
  if (params.page)       q.set('page',       String(params.page));
  if (params.limit)      q.set('limit',      String(params.limit));
  if (params.search)     q.set('search',     params.search);
  if (params.isActive !== undefined) q.set('isActive', String(params.isActive));
  if (params.sortBy)    q.set('sortBy',    params.sortBy);
  if (params.sortOrder) q.set('sortOrder', params.sortOrder);
  const url = q.toString() ? `${PATHS.BRANDS.LIST}?${q}` : PATHS.BRANDS.LIST;
  return apiGet<GetBrandsPaginatedResponse>(url);
}

export function uploadBrandLogo(file: File): Promise<{ url: string }> {
  const form = new FormData();
  form.append('logo', file);
  return apiPost<{ url: string }>(PATHS.BRANDS.LOGO, form);
}

export function createBrand(data: BrandPayload): Promise<Brand> {
  return apiPost<{ brand: Brand }>(PATHS.BRANDS.LIST, data).then(r => r.brand);
}

export function updateBrand(id: number, data: UpdateBrandPayload): Promise<Brand> {
  return apiPut<{ brand: Brand }>(PATHS.BRANDS.BY_ID(id), data).then(r => r.brand);
}

export function deleteBrand(id: number): Promise<void> {
  return apiDelete<null>(PATHS.BRANDS.BY_ID(id)).then(() => undefined);
}
