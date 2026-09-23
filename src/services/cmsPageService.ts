import { apiGet } from '../lib/axios';
import { PATHS } from '../api/paths';
import type { CmsPage, CmsPageSummary } from '../types';

// Without audience=seller the API falls back to customer pages.
const SELLER_AUDIENCE = { audience: 'seller' } as const;

export function getCmsPages(): Promise<{ cmsPages: CmsPageSummary[] }> {
  return apiGet<{ cmsPages: CmsPageSummary[] }>(PATHS.CMS_PAGES.LIST, SELLER_AUDIENCE);
}

export function getCmsPageBySlug(slug: string): Promise<{ cmsPage: CmsPage }> {
  return apiGet<{ cmsPage: CmsPage }>(PATHS.CMS_PAGES.BY_SLUG(slug), SELLER_AUDIENCE);
}
