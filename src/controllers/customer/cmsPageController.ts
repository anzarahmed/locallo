import type { Request, Response } from 'express';
import { sendSuccess, handleServiceError } from '../../utils/response';
import { parseCmsAudience } from '../../utils/cmsAudience';
import { getPublicCmsPage, listPublicCmsPages } from '../../services/customer/cmsPageService';

export async function getCmsPages(req: Request, res: Response): Promise<void> {
  try {
    const cmsPages = await listPublicCmsPages(parseCmsAudience(req.query.audience));
    sendSuccess(res, { cmsPages }, 'Pages fetched');
  } catch (err: unknown) {
    handleServiceError(err, res, 'Failed to load pages');
  }
}

export async function getCmsPage(req: Request, res: Response): Promise<void> {
  try {
    const page = await getPublicCmsPage(String(req.params.slug), parseCmsAudience(req.query.audience));
    sendSuccess(res, { cmsPage: page }, 'Page fetched');
  } catch (err: unknown) {
    handleServiceError(err, res, 'Failed to load page');
  }
}
