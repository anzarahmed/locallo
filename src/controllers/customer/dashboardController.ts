import type { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { getPresignedUrlOrNull } from '../../utils/imageStorage';
import { getDashboardMasterCategories, getDashboardBanners, getDashboardBrands } from '../../services/customer/dashboardService';

interface DashboardMasterCategory {
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
  const rows = await getDashboardMasterCategories();
  const categories: DashboardMasterCategory[] = await Promise.all(rows.map(async (m) => ({
    id: m.id,
    title: m.name,
    icon: (await getPresignedUrlOrNull(m.icon)) ?? '',
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
