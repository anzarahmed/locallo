import type { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { getPresignedUrlOrNull } from '../../utils/imageStorage';
import { getDashboardCategories, getDashboardBanners, getDashboardBrands } from '../../services/customer/dashboardService';

interface DashboardCategory {
  id: number;
  title: string;
  icon: string;
}

interface DashboardBrand {
  id: number;
  name: string;
  slug: string;
  logo: string;
}

export async function getDashboard(_req: Request, res: Response): Promise<void> {
  const rows = await getDashboardCategories();
  const categories: DashboardCategory[] = await Promise.all(rows.map(async (c) => ({
    id: c.id,
    title: c.name,
    icon: (await getPresignedUrlOrNull(c.icon)) ?? '',
  })));
  const banners = await getDashboardBanners();

  const brandRows = await getDashboardBrands();
  const brands: DashboardBrand[] = await Promise.all(brandRows.map(async (b) => ({
    id: b.id,
    name: b.name,
    slug: b.slug,
    logo: (await getPresignedUrlOrNull(b.logo)) ?? '',
  })));

  sendSuccess(res, { banners, categories, brands, offers: [] }, 'Dashboard data fetched');
}
