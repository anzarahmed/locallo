import { Op } from 'sequelize';
import type { InferType } from 'yup';
import { Brand } from '../../models/Brand';
import { normalizeImageKey, commitBrandLogo, deleteImage } from '../../utils/imageStorage';
import type { createBrandSchema, updateBrandSchema } from '../../validation/admin/brandSchemas';

type CreateBrandInput = InferType<typeof createBrandSchema>;
type UpdateBrandInput = InferType<typeof updateBrandSchema>;

const VALID_BRAND_SORT = new Set(['name', 'slug', 'isActive', 'createdAt']);

interface ListBrandsFilter {
  search?: string;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export async function listBrands(
  filters: ListBrandsFilter = {},
  page = 1,
  limit = 1000,
): Promise<{ rows: Brand[]; count: number }> {
  const where: Record<string, unknown> = {};
  if (filters.isActive !== undefined) where.isActive = filters.isActive;
  if (filters.search) where.name = { [Op.iLike]: `%${filters.search}%` };

  const sortField = VALID_BRAND_SORT.has(filters.sortBy ?? '') ? (filters.sortBy as string) : 'name';
  const sortOrder = filters.sortOrder ?? 'ASC';

  return Brand.findAndCountAll({
    where,
    order: [[sortField, sortOrder]],
    limit,
    offset: (page - 1) * limit,
  });
}

export async function createBrand(data: CreateBrandInput): Promise<Brand> {
  const existing = await Brand.findOne({ where: { name: data.name } });
  if (existing) {
    throw Object.assign(new Error('Brand name already exists'), { status: 409 });
  }
  const slugExists = await Brand.findOne({ where: { slug: data.slug } });
  if (slugExists) {
    throw Object.assign(new Error('Brand slug already exists'), { status: 409 });
  }
  const logo = data.logo ? await commitBrandLogo(normalizeImageKey(data.logo)) : null;
  return Brand.create({ name: data.name, slug: data.slug, logo });
}

export async function updateBrand(id: number, data: UpdateBrandInput): Promise<Brand> {
  const brand = await Brand.findByPk(id);
  if (!brand) {
    throw Object.assign(new Error('Brand not found'), { status: 404 });
  }

  if (data.name && data.name !== brand.name) {
    const existing = await Brand.findOne({ where: { name: data.name } });
    if (existing) {
      throw Object.assign(new Error('Brand name already exists'), { status: 409 });
    }
  }
  if (data.slug && data.slug !== brand.slug) {
    const slugExists = await Brand.findOne({ where: { slug: data.slug } });
    if (slugExists) {
      throw Object.assign(new Error('Brand slug already exists'), { status: 409 });
    }
  }

  const updates: Partial<UpdateBrandInput> = { ...data };
  if (data.logo !== undefined) {
    const previousLogo = brand.logo;
    const newLogo = data.logo ? await commitBrandLogo(normalizeImageKey(data.logo)) : null;
    updates.logo = newLogo;
    if (previousLogo && previousLogo !== newLogo) {
      await deleteImage(previousLogo).catch(() => {});
    }
  }

  await brand.update(updates);
  return brand;
}

export async function deleteBrand(id: number): Promise<void> {
  const brand = await Brand.findByPk(id);
  if (!brand) {
    throw Object.assign(new Error('Brand not found'), { status: 404 });
  }
  await brand.destroy();
}
