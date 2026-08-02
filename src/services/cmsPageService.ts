import { apiGet } from '../lib/axios';
import { PATHS } from '../api/paths';
import type { CmsPage } from '../types';

export function getCmsPageBySlug(slug: string): Promise<{ cmsPage: CmsPage }> {
  return apiGet<{ cmsPage: CmsPage }>(PATHS.CMS_PAGE(slug));
}
