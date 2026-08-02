import { Op } from 'sequelize';
import type { InferType } from 'yup';
import { CmsPage } from '../../models/CmsPage';
import type { createCmsPageSchema, updateCmsPageSchema } from '../../validation/admin/cmsPageSchemas';

type CreateCmsPageInput = InferType<typeof createCmsPageSchema>;
type UpdateCmsPageInput = InferType<typeof updateCmsPageSchema>;

const VALID_CMS_PAGE_SORT = new Set(['title', 'slug', 'isActive', 'createdAt']);

interface ListCmsPagesFilter {
  search?: string;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export async function listCmsPages(
  filters: ListCmsPagesFilter = {},
  page = 1,
  limit = 1000,
): Promise<{ rows: CmsPage[]; count: number }> {
  const where: Record<string, unknown> = {};
  if (filters.isActive !== undefined) where.isActive = filters.isActive;
  if (filters.search) where.title = { [Op.iLike]: `%${filters.search}%` };

  const sortField = VALID_CMS_PAGE_SORT.has(filters.sortBy ?? '') ? (filters.sortBy as string) : 'createdAt';
  const sortOrder = filters.sortOrder ?? 'ASC';

  return CmsPage.findAndCountAll({
    where,
    order: [[sortField, sortOrder]],
    limit,
    offset: (page - 1) * limit,
  });
}

export async function createCmsPage(data: CreateCmsPageInput): Promise<CmsPage> {
  const slugExists = await CmsPage.findOne({ where: { slug: data.slug } });
  if (slugExists) {
    throw Object.assign(new Error('A page with that slug already exists'), { status: 409 });
  }
  return CmsPage.create({ title: data.title, slug: data.slug, content: data.content });
}

export async function updateCmsPage(id: number, data: UpdateCmsPageInput): Promise<CmsPage> {
  const page = await CmsPage.findByPk(id);
  if (!page) {
    throw Object.assign(new Error('Page not found'), { status: 404 });
  }

  if (data.slug && data.slug !== page.slug) {
    const slugExists = await CmsPage.findOne({ where: { slug: data.slug } });
    if (slugExists) {
      throw Object.assign(new Error('A page with that slug already exists'), { status: 409 });
    }
  }

  await page.update(data);
  return page;
}

export async function deleteCmsPage(id: number): Promise<void> {
  const page = await CmsPage.findByPk(id);
  if (!page) {
    throw Object.assign(new Error('Page not found'), { status: 404 });
  }
  await page.destroy();
}
