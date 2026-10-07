import type { Request, Response } from 'express';
import { sendSuccess, sendError, handleServiceError } from '../../utils/response';
import { parsePagination } from '../../utils/pagination';
import { saveImage, getPresignedUrl, getPresignedUrlOrNull } from '../../utils/imageStorage';
import * as masterCategoryService from '../../services/admin/masterCategoryService';
import type { MasterCategory } from '../../models/MasterCategory';

async function withSignedIcon(masterCategory: MasterCategory, categoryCount?: number): Promise<Record<string, unknown>> {
  const json = masterCategory.toJSON() as Record<string, unknown>;
  const result: Record<string, unknown> = { ...json, icon: await getPresignedUrlOrNull(json.icon as string | null) };
  if (categoryCount !== undefined) result.categoryCount = categoryCount;
  return result;
}

export async function getMasterCategories(req: Request, res: Response): Promise<void> {
  const { page, limit } = parsePagination(req, 100);
  const search     = req.query.search     ? String(req.query.search)     : undefined;
  const sortBy     = req.query.sortBy     ? String(req.query.sortBy)     : undefined;
  const sortOrder  = req.query.sortOrder  === 'asc' ? 'ASC' : 'DESC';
  const isActiveRaw = req.query.isActive;
  const isActive   = isActiveRaw === 'true' ? true : isActiveRaw === 'false' ? false : undefined;

  const { rows, count } = await masterCategoryService.listMasterCategories(
    { search, isActive, sortBy, sortOrder },
    page,
    limit,
  );
  const categoryCounts = await masterCategoryService.getCategoryCounts(rows.map((r) => r.id));
  const masterCategories = await Promise.all(rows.map((r) => withSignedIcon(r, categoryCounts.get(r.id) ?? 0)));
  sendSuccess(res, { masterCategories, total: count, page, limit }, 'Master categories fetched');
}

export async function uploadMasterCategoryIcon(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    sendError(res, 'No icon file provided', 400);
    return;
  }
  try {
    const key = await saveImage(req.file, 'master-categories');
    const url = await getPresignedUrl(key);
    sendSuccess(res, { url }, 'Icon uploaded', 201);
  } catch (err: unknown) {
    handleServiceError(err, res, 'Failed to upload icon');
  }
}

export async function addMasterCategory(req: Request, res: Response): Promise<void> {
  try {
    const masterCategory = await masterCategoryService.createMasterCategory(
      req.body as Parameters<typeof masterCategoryService.createMasterCategory>[0],
    );
    const signed = await withSignedIcon(masterCategory);
    sendSuccess(res, { masterCategory: signed }, 'Master category created', 201);
  } catch (err: unknown) {
    handleServiceError(err, res, 'Failed to create master category');
  }
}

export async function editMasterCategory(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    const masterCategory = await masterCategoryService.updateMasterCategory(
      id,
      req.body as Parameters<typeof masterCategoryService.updateMasterCategory>[1],
    );
    const signed = await withSignedIcon(masterCategory);
    sendSuccess(res, { masterCategory: signed }, 'Master category updated');
  } catch (err: unknown) {
    handleServiceError(err, res, 'Failed to update master category');
  }
}

export async function removeMasterCategory(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    await masterCategoryService.deleteMasterCategory(id);
    sendSuccess(res, null, 'Master category deleted');
  } catch (err: unknown) {
    handleServiceError(err, res, 'Failed to delete master category');
  }
}
