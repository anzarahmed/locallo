import { apiGet, apiPost, apiPut, apiDelete } from '../lib/axios';
import { PATHS } from '../api/paths';
import type { CmsPage } from '../types';

export interface GetCmsPagesPaginatedParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface GetCmsPagesPaginatedResponse {
  cmsPages: CmsPage[];
  total: number;
  page: number;
  limit: number;
}

interface CmsPagePayload {
  title: string;
  slug: string;
  content: string;
}

interface UpdateCmsPagePayload {
  title?: string;
  slug?: string;
  content?: string;
  isActive?: boolean;
}

export function getCmsPagesPaginated(
  params: GetCmsPagesPaginatedParams = {},
): Promise<GetCmsPagesPaginatedResponse> {
  const q = new URLSearchParams();
  if (params.page)       q.set('page',       String(params.page));
  if (params.limit)      q.set('limit',      String(params.limit));
  if (params.search)     q.set('search',     params.search);
  if (params.isActive !== undefined) q.set('isActive', String(params.isActive));
  if (params.sortBy)    q.set('sortBy',    params.sortBy);
  if (params.sortOrder) q.set('sortOrder', params.sortOrder);
  const url = q.toString() ? `${PATHS.CMS_PAGES.LIST}?${q}` : PATHS.CMS_PAGES.LIST;
  return apiGet<GetCmsPagesPaginatedResponse>(url);
}

export function createCmsPage(data: CmsPagePayload): Promise<CmsPage> {
  return apiPost<{ cmsPage: CmsPage }>(PATHS.CMS_PAGES.LIST, data).then(r => r.cmsPage);
}

export function updateCmsPage(id: number, data: UpdateCmsPagePayload): Promise<CmsPage> {
  return apiPut<{ cmsPage: CmsPage }>(PATHS.CMS_PAGES.BY_ID(id), data).then(r => r.cmsPage);
}

export function deleteCmsPage(id: number): Promise<void> {
  return apiDelete<null>(PATHS.CMS_PAGES.BY_ID(id)).then(() => undefined);
}
