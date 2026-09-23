import { CmsPage } from '../../models/CmsPage';
import type { CmsAudience } from '../../types';

export async function listPublicCmsPages(audience: CmsAudience): Promise<CmsPage[]> {
  return CmsPage.findAll({
    where: { audience, isActive: true },
    attributes: ['id', 'title', 'slug', 'updatedAt'],
    order: [['title', 'ASC']],
  });
}

export async function getPublicCmsPage(slug: string, audience: CmsAudience): Promise<CmsPage> {
  const page = await CmsPage.findOne({ where: { slug, audience, isActive: true } });
  if (!page) {
    throw Object.assign(new Error('Page not found'), { status: 404 });
  }
  return page;
}
