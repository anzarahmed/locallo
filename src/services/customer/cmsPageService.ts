import { CmsPage } from '../../models/CmsPage';

export async function getPublicCmsPage(slug: string): Promise<CmsPage> {
  const page = await CmsPage.findOne({ where: { slug, isActive: true } });
  if (!page) {
    throw Object.assign(new Error('Page not found'), { status: 404 });
  }
  return page;
}
