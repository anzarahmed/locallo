import type { Request, Response } from 'express';
import { sendSuccess, sendError } from '../../utils/response';
import * as categoryService from '../../services/admin/categoryService';

export async function getCategories(req: Request, res: Response): Promise<void> {
  const includeInactive = req.query.includeInactive === 'true';
  const categories = await categoryService.listCategories(includeInactive);
  sendSuccess(res, { categories });
}

export async function addCategory(req: Request, res: Response): Promise<void> {
  try {
    const category = await categoryService.createCategory(req.body as Parameters<typeof categoryService.createCategory>[0]);
    res.status(201);
    sendSuccess(res, { category });
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    sendError(res, e.message ?? 'Failed to create category', e.status ?? 500);
  }
}

export async function editCategory(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    const category = await categoryService.updateCategory(id, req.body as Parameters<typeof categoryService.updateCategory>[1]);
    sendSuccess(res, { category });
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    sendError(res, e.message ?? 'Failed to update category', e.status ?? 500);
  }
}

export async function removeCategory(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    await categoryService.deleteCategory(id);
    sendSuccess(res, null);
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    sendError(res, e.message ?? 'Failed to delete category', e.status ?? 500);
  }
}
