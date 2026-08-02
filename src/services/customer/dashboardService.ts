import { Op } from 'sequelize';
import { Category } from '../../models/Category';
import { Banner } from '../../models/Banner';
import { Brand } from '../../models/Brand';
import { getPresignedUrlOrNull } from '../../utils/imageStorage';

export interface DashboardBanner {
  id: number;
  imageUrl: string;
  title: string;
  dataId: number;
  type: 'BRAND';
}

export async function getDashboardCategories(): Promise<Category[]> {
  return Category.findAll({
    attributes: ['id', 'name', 'icon'],
    where: { isActive: true },
    order: [['name', 'ASC']],
  });
}

export async function getDashboardBrands(): Promise<Brand[]> {
  return Brand.findAll({
    attributes: ['id', 'name', 'slug', 'logo'],
    where: { isActive: true },
    order: [['name', 'ASC']],
  });
}

export async function getDashboardBanners(): Promise<DashboardBanner[]> {
  const today = new Date().toISOString().slice(0, 10);
  const rows = await Banner.findAll({
    where: {
      isActive: true,
      startDate: { [Op.lte]: today },
      endDate: { [Op.gte]: today },
    },
    include: [{ model: Brand, attributes: ['id', 'slug'] }],
    order: [['startDate', 'ASC']],
  });

  return Promise.all(rows.map(async (banner) => ({
    id: banner.id,
    imageUrl: (await getPresignedUrlOrNull(banner.image)) ?? '',
    title: banner.title ?? '',
    dataId: banner.brand.id,
    type: 'BRAND',
  })));
}
