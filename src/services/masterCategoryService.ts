import { apiGet, apiPost, apiPut, apiDelete } from '../lib/axios';
import { PATHS } from '../api/paths';
import type { MasterCategory } from '../types';

interface GetMasterCategoriesResponse {
  masterCategories: MasterCategory[];
}

export interface GetMasterCategoriesPaginatedParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface GetMasterCategoriesPaginatedResponse {
  masterCategories: MasterCategory[];
  total: number;
  page: number;
  limit: number;
}

interface MasterCategoryPayload {
  name: string;
  slug: string;
  icon?: string | null;
}

interface UpdateMasterCategoryPayload {
  name?: string;
  slug?: string;
  isActive?: boolean;
  icon?: string | null;
}

export function getMasterCategories(includeInactive = false): Promise<MasterCategory[]> {
  const url = includeInactive
    ? PATHS.MASTER_CATEGORIES.LIST
    : `${PATHS.MASTER_CATEGORIES.LIST}?isActive=true`;
  return apiGet<GetMasterCategoriesResponse>(url).then(r => r.masterCategories);
}

export function getMasterCategoriesPaginated(
  params: GetMasterCategoriesPaginatedParams = {},
): Promise<GetMasterCategoriesPaginatedResponse> {
  const q = new URLSearchParams();
  if (params.page)       q.set('page',       String(params.page));
  if (params.limit)      q.set('limit',      String(params.limit));
  if (params.search)     q.set('search',     params.search);
  if (params.isActive !== undefined) q.set('isActive', String(params.isActive));
  if (params.sortBy)    q.set('sortBy',    params.sortBy);
  if (params.sortOrder) q.set('sortOrder', params.sortOrder);
  const url = q.toString() ? `${PATHS.MASTER_CATEGORIES.LIST}?${q}` : PATHS.MASTER_CATEGORIES.LIST;
  return apiGet<GetMasterCategoriesPaginatedResponse>(url);
}

export function uploadMasterCategoryIcon(file: File): Promise<{ url: string }> {
  const form = new FormData();
  form.append('icon', file);
  return apiPost<{ url: string }>(PATHS.MASTER_CATEGORIES.ICON, form);
}

export function createMasterCategory(data: MasterCategoryPayload): Promise<MasterCategory> {
  return apiPost<{ masterCategory: MasterCategory }>(PATHS.MASTER_CATEGORIES.LIST, data).then(r => r.masterCategory);
}

export function updateMasterCategory(id: number, data: UpdateMasterCategoryPayload): Promise<MasterCategory> {
  return apiPut<{ masterCategory: MasterCategory }>(PATHS.MASTER_CATEGORIES.BY_ID(id), data).then(r => r.masterCategory);
}

export function deleteMasterCategory(id: number): Promise<void> {
  return apiDelete<null>(PATHS.MASTER_CATEGORIES.BY_ID(id)).then(() => undefined);
}
