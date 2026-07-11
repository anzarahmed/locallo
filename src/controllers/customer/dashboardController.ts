import type { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { getDashboardCategories, getDashboardBanners } from '../../services/customer/dashboardService';

interface DashboardCategory {
  id: number;
  title: string;
  icon: string;
}

export async function getDashboard(_req: Request, res: Response): Promise<void> {
  const rows = await getDashboardCategories();
  const categories: DashboardCategory[] = rows.map((c) => ({
    id: c.id,
    title: c.name,
    icon: '',
  }));
  const banners = getDashboardBanners();

  sendSuccess(res, { banners, categories, offers: [] }, 'Dashboard data fetched');
}
