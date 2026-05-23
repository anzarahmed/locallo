import { apiGet, apiPost, apiPut, apiDelete } from '../lib/axios';
import { PATHS } from '../api/paths';
import type { AttributeField, Category } from '../types';

interface GetCategoriesResponse {
  categories: Category[];
}

interface CategoryPayload {
  name: string;
  slug: string;
}

interface UpdateCategoryPayload {
  name?: string;
  slug?: string;
  isActive?: boolean;
  attributeSchema?: AttributeField[];
}

export function getCategories(includeInactive = false): Promise<Category[]> {
  const url = includeInactive
    ? `${PATHS.CATEGORIES.LIST}?includeInactive=true`
    : PATHS.CATEGORIES.LIST;
  return apiGet<GetCategoriesResponse>(url).then(r => r.categories);
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
