import { apiGet, apiPost, apiPut, apiDelete } from '../lib/axios';
import { PATHS } from '../api/paths';
import type { AttributeField, Category } from '../types';

interface GetCategoriesResponse {
  categories: Category[];
}

export interface GetCategoriesPaginatedParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface GetCategoriesPaginatedResponse {
  categories: Category[];
  total: number;
  page: number;
  limit: number;
}

interface CategoryPayload {
  name: string;
  slug: string;
  attributeSchema?: AttributeField[];
}

interface UpdateCategoryPayload {
  name?: string;
  slug?: string;
  isActive?: boolean;
  attributeSchema?: AttributeField[];
}

export function getCategories(includeInactive = false): Promise<Category[]> {
  const url = includeInactive
    ? PATHS.CATEGORIES.LIST
    : `${PATHS.CATEGORIES.LIST}?isActive=true`;
  return apiGet<GetCategoriesResponse>(url).then(r => r.categories);
}

export function getCategoriesPaginated(
  params: GetCategoriesPaginatedParams = {},
): Promise<GetCategoriesPaginatedResponse> {
  const q = new URLSearchParams();
  if (params.page)       q.set('page',       String(params.page));
  if (params.limit)      q.set('limit',      String(params.limit));
  if (params.search)     q.set('search',     params.search);
  if (params.isActive !== undefined) q.set('isActive', String(params.isActive));
  if (params.sortBy)    q.set('sortBy',    params.sortBy);
  if (params.sortOrder) q.set('sortOrder', params.sortOrder);
  const url = q.toString() ? `${PATHS.CATEGORIES.LIST}?${q}` : PATHS.CATEGORIES.LIST;
  return apiGet<GetCategoriesPaginatedResponse>(url);
}

export function createCategory(data: CategoryPayload): Promise<Category> {
  return apiPost<{ category: Category }>(PATHS.CATEGORIES.LIST, data).then(r => r.category);
}

export function updateCategory(id: number, data: UpdateCategoryPayload): Promise<Category> {
  return apiPut<{ category: Category }>(PATHS.CATEGORIES.BY_ID(id), data).then(r => r.category);
}

export function deleteCategory(id: number): Promise<void> {
  return apiDelete<null>(PATHS.CATEGORIES.BY_ID(id)).then(() => undefined);
}
