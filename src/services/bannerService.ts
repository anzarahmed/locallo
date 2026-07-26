import { apiGet, apiPost, apiPut, apiDelete } from '../lib/axios';
import { PATHS } from '../api/paths';
import type { Banner } from '../types';

export interface GetBannersPaginatedParams {
  page?: number;
  limit?: number;
  brandId?: number;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface GetBannersPaginatedResponse {
  banners: Banner[];
  total: number;
  page: number;
  limit: number;
}

interface BannerPayload {
  brandId: number;
  image: string;
  title?: string | null;
  startDate: string;
  endDate: string;
}

interface UpdateBannerPayload {
  brandId?: number;
  image?: string;
  title?: string | null;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
}

export function getBannersPaginated(
  params: GetBannersPaginatedParams = {},
): Promise<GetBannersPaginatedResponse> {
  const q = new URLSearchParams();
  if (params.page)    q.set('page',    String(params.page));
  if (params.limit)   q.set('limit',   String(params.limit));
  if (params.brandId) q.set('brandId', String(params.brandId));
  if (params.isActive !== undefined) q.set('isActive', String(params.isActive));
  if (params.sortBy)    q.set('sortBy',    params.sortBy);
  if (params.sortOrder) q.set('sortOrder', params.sortOrder);
  const url = q.toString() ? `${PATHS.BANNERS.LIST}?${q}` : PATHS.BANNERS.LIST;
  return apiGet<GetBannersPaginatedResponse>(url);
}

export function uploadBannerImage(file: File): Promise<{ url: string }> {
  const form = new FormData();
  form.append('image', file);
  return apiPost<{ url: string }>(PATHS.BANNERS.IMAGE, form);
}

export function createBanner(data: BannerPayload): Promise<Banner> {
  return apiPost<{ banner: Banner }>(PATHS.BANNERS.LIST, data).then(r => r.banner);
}

export function updateBanner(id: number, data: UpdateBannerPayload): Promise<Banner> {
  return apiPut<{ banner: Banner }>(PATHS.BANNERS.BY_ID(id), data).then(r => r.banner);
}

export function deleteBanner(id: number): Promise<void> {
  return apiDelete<null>(PATHS.BANNERS.BY_ID(id)).then(() => undefined);
}
