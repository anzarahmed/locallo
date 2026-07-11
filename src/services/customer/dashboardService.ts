import { Category } from '../../models/Category';

export async function getDashboardCategories(): Promise<Category[]> {
  return Category.findAll({
    attributes: ['id', 'name'],
    where: { isActive: true },
    order: [['name', 'ASC']],
  });
}
