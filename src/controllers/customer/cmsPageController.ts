import type { Request, Response } from 'express';
import { sendSuccess, handleServiceError } from '../../utils/response';
import { getPublicCmsPage } from '../../services/customer/cmsPageService';

export async function getCmsPage(req: Request, res: Response): Promise<void> {
  try {
    const page = await getPublicCmsPage(String(req.params.slug));
    sendSuccess(res, { cmsPage: page }, 'Page fetched');
  } catch (err: unknown) {
    handleServiceError(err, res, 'Failed to load page');
  }
}
