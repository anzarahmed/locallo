import { Op } from 'sequelize';
import type { InferType } from 'yup';
import { Banner } from '../../models/Banner';
import { Brand } from '../../models/Brand';
import { normalizeImageKey, commitBannerImage, deleteImage } from '../../utils/imageStorage';
import type { createBannerSchema, updateBannerSchema } from '../../validation/admin/bannerSchemas';

type CreateBannerInput = InferType<typeof createBannerSchema>;
type UpdateBannerInput = InferType<typeof updateBannerSchema>;

const VALID_BANNER_SORT = new Set(['startDate', 'endDate', 'createdAt']);

interface ListBannersFilter {
  brandId?: number;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export async function listBanners(
  filters: ListBannersFilter = {},
  page = 1,
  limit = 20,
): Promise<{ rows: Banner[]; count: number }> {
  const where: Record<string, unknown> = {};
  if (filters.brandId !== undefined) where.brandId = filters.brandId;
  if (filters.isActive !== undefined) where.isActive = filters.isActive;

  const sortField = VALID_BANNER_SORT.has(filters.sortBy ?? '') ? (filters.sortBy as string) : 'startDate';
  const sortOrder = filters.sortOrder ?? 'ASC';

  return Banner.findAndCountAll({
    where,
    include: [{ model: Brand, attributes: ['id', 'name', 'slug'] }],
    order: [[sortField, sortOrder]],
    limit,
    offset: (page - 1) * limit,
  });
}

export async function getBannerById(id: number): Promise<Banner> {
  const banner = await Banner.findByPk(id, { include: [{ model: Brand, attributes: ['id', 'name', 'slug'] }] });
  if (!banner) {
    throw Object.assign(new Error('Banner not found'), { status: 404 });
  }
  return banner;
}

async function assertBrandExists(brandId: number): Promise<void> {
  const brand = await Brand.findByPk(brandId);
  if (!brand) {
    throw Object.assign(new Error('Brand not found'), { status: 404 });
  }
}

export async function createBanner(data: CreateBannerInput, createdBy: string): Promise<Banner> {
  await assertBrandExists(data.brandId);
  const image = await commitBannerImage(normalizeImageKey(data.image));
  const banner = await Banner.create({
    brandId: data.brandId,
    image,
    title: data.title ?? null,
    startDate: data.startDate,
    endDate: data.endDate,
    createdBy,
  });
  return getBannerById(banner.id);
}

export async function updateBanner(id: number, data: UpdateBannerInput): Promise<Banner> {
  const banner = await Banner.findByPk(id);
  if (!banner) {
    throw Object.assign(new Error('Banner not found'), { status: 404 });
  }

  if (data.brandId !== undefined) {
    await assertBrandExists(data.brandId);
  }

  const updates: Partial<UpdateBannerInput> = { ...data };
  if (data.image !== undefined) {
    const previousImage = banner.image;
    const newImage = await commitBannerImage(normalizeImageKey(data.image));
    updates.image = newImage;
    if (previousImage && previousImage !== newImage) {
      await deleteImage(previousImage).catch(() => {});
    }
  }

  await banner.update(updates);
  return getBannerById(id);
}

export async function deleteBanner(id: number): Promise<void> {
  const banner = await Banner.findByPk(id);
  if (!banner) {
    throw Object.assign(new Error('Banner not found'), { status: 404 });
  }
  await banner.destroy();
}
