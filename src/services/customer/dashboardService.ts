import { Category } from '../../models/Category';

export interface DashboardBanner {
  id: number;
  imageUrl: string;
  title: string;
  link: string;
}

// Static until super_admin banner management (CRUD + S3 upload) is built.
const STATIC_BANNERS: DashboardBanner[] = [
  { id: 1, imageUrl: 'https://picsum.photos/seed/localo-banner-1/1200/400', title: 'Big Summer Sale', link: '' },
  { id: 2, imageUrl: 'https://picsum.photos/seed/localo-banner-2/1200/400', title: 'New Arrivals', link: '' },
  { id: 3, imageUrl: 'https://picsum.photos/seed/localo-banner-3/1200/400', title: 'Shop Local', link: '' },
];

export async function getDashboardCategories(): Promise<Category[]> {
  return Category.findAll({
    attributes: ['id', 'name'],
    where: { isActive: true },
    order: [['name', 'ASC']],
  });
}

export function getDashboardBanners(): DashboardBanner[] {
  return STATIC_BANNERS;
}
