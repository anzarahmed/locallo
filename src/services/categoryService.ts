import { apiGet } from '../lib/axios';
import { PATHS } from '../api/paths';
import type { Category } from '../types';

interface GetCategoriesResponse {
  categories: Category[];
}

export function getCategories(): Promise<Category[]> {
  return apiGet<GetCategoriesResponse>(PATHS.CATEGORIES.LIST).then(r => r.categories);
}
