import type { Request, Response } from 'express';
import { sendSuccess, sendError, handleServiceError } from '../../utils/response';
import { parsePagination } from '../../utils/pagination';
import { saveImage, getPresignedUrl, getPresignedUrlOrNull } from '../../utils/imageStorage';
import * as categoryService from '../../services/admin/categoryService';
import type { Category } from '../../models/Category';

async function withSignedIcon(category: Category): Promise<Record<string, unknown>> {
  const json = category.toJSON() as Record<string, unknown>;
  return { ...json, icon: await getPresignedUrlOrNull(json.icon as string | null) };
}

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
  const categories = await Promise.all(rows.map(withSignedIcon));
  sendSuccess(res, { categories, total: count, page, limit }, 'Categories fetched');
}

export async function uploadCategoryIcon(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    sendError(res, 'No icon file provided', 400);
    return;
  }
  try {
    const key = await saveImage(req.file, 'categories');
    const url = await getPresignedUrl(key);
    sendSuccess(res, { url }, 'Icon uploaded', 201);
  } catch (err: unknown) {
    handleServiceError(err, res, 'Failed to upload icon');
  }
}

export async function addCategory(req: Request, res: Response): Promise<void> {
  try {
    const category = await categoryService.createCategory(req.body as Parameters<typeof categoryService.createCategory>[0]);
    const signed = await withSignedIcon(category);
    sendSuccess(res, { category: signed }, 'Category created', 201);
  } catch (err: unknown) {
    handleServiceError(err, res, 'Failed to create category');
  }
}

export async function editCategory(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    const category = await categoryService.updateCategory(id, req.body as Parameters<typeof categoryService.updateCategory>[1]);
    const signed = await withSignedIcon(category);
    sendSuccess(res, { category: signed }, 'Category updated');
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
