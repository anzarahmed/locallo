import type { Request, Response } from 'express';
import { sendSuccess, handleServiceError } from '../../utils/response';
import { parsePagination } from '../../utils/pagination';
import * as cmsPageService from '../../services/admin/cmsPageService';

export async function getCmsPages(req: Request, res: Response): Promise<void> {
  const { page, limit } = parsePagination(req, 100);
  const search      = req.query.search  ? String(req.query.search)  : undefined;
  const sortBy      = req.query.sortBy  ? String(req.query.sortBy)  : undefined;
  const sortOrder   = req.query.sortOrder === 'desc' ? 'DESC' : 'ASC';
  const isActiveRaw = req.query.isActive;
  const isActive    = isActiveRaw === 'true' ? true : isActiveRaw === 'false' ? false : undefined;

  const { rows, count } = await cmsPageService.listCmsPages(
    { search, isActive, sortBy, sortOrder },
    page,
    limit,
  );
  sendSuccess(res, { cmsPages: rows, total: count, page, limit }, 'CMS pages fetched');
}

export async function addCmsPage(req: Request, res: Response): Promise<void> {
  try {
    const page = await cmsPageService.createCmsPage(req.body as Parameters<typeof cmsPageService.createCmsPage>[0]);
    sendSuccess(res, { cmsPage: page }, 'Page created', 201);
  } catch (err: unknown) {
    handleServiceError(err, res, 'Failed to create page');
  }
}

export async function editCmsPage(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    const page = await cmsPageService.updateCmsPage(id, req.body as Parameters<typeof cmsPageService.updateCmsPage>[1]);
    sendSuccess(res, { cmsPage: page }, 'Page updated');
  } catch (err: unknown) {
    handleServiceError(err, res, 'Failed to update page');
  }
}

export async function removeCmsPage(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    await cmsPageService.deleteCmsPage(id);
    sendSuccess(res, null, 'Page deleted');
  } catch (err: unknown) {
    handleServiceError(err, res, 'Failed to delete page');
  }
}
