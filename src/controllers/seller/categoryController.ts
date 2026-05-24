import type { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { listCategories } from '../../services/admin/categoryService';

export async function getCategories(_req: Request, res: Response): Promise<void> {
  const { rows: categories } = await listCategories({ isActive: true });
  sendSuccess(res, { categories }, 'Categories fetched');
}
