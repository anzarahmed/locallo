import type { Request, Response } from 'express';
import { sendSuccess, handleServiceError } from '../../utils/response';
import { parsePagination } from '../../utils/pagination';
import * as categoryService from '../../services/admin/categoryService';

export async function getCategories(req: Request, res: Response): Promise<void> {
  const { page, limit } = parsePagination(req, 100);
  const search     = req.query.search     ? String(req.query.search)     : undefined;
  const sortBy     = req.query.sortBy     ? String(req.query.sortBy)     : undefined;
  const sortOrder  = req.query.sortOrder  === 'asc' ? 'ASC' : 'DESC';
  const isActiveRaw = req.query.isActive;
  const isActive   = isActiveRaw === 'true' ? true : isActiveRaw === 'false' ? false : undefined;

  const { rows, count } = await categoryService.listCategories(
    { search, isActive, sortBy, sortOrder },
    page,
    limit,
  );
  sendSuccess(res, { categories: rows, total: count, page, limit }, 'Categories fetched');
}

export async function addCategory(req: Request, res: Response): Promise<void> {
  try {
    const category = await categoryService.createCategory(req.body as Parameters<typeof categoryService.createCategory>[0]);
    sendSuccess(res, { category }, 'Category created', 201);
  } catch (err: unknown) {
    handleServiceError(err, res, 'Failed to create category');
  }
}

export async function editCategory(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    const category = await categoryService.updateCategory(id, req.body as Parameters<typeof categoryService.updateCategory>[1]);
    sendSuccess(res, { category }, 'Category updated');
  } catch (err: unknown) {
    handleServiceError(err, res, 'Failed to update category');
  }
}

export async function removeCategory(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    await categoryService.deleteCategory(id);
    sendSuccess(res, null, 'Category deleted');
  } catch (err: unknown) {
    handleServiceError(err, res, 'Failed to delete category');
  }
}
