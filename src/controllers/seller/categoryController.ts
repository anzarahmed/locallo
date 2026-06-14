import type { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { listCategories } from '../../services/admin/categoryService';
import { getSellerCategories } from '../../services/seller/categoryService';

export async function getCategories(_req: Request, res: Response): Promise<void> {
  const { rows: categories } = await listCategories({ isActive: true });
  sendSuccess(res, { categories }, 'Categories fetched');
}

export async function getMyCategories(req: Request, res: Response): Promise<void> {
  const categories = await getSellerCategories(req.seller!.id);
  sendSuccess(res, { categories }, 'Categories fetched');
}
