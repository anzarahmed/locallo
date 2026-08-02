import type { Request, Response } from 'express';
import { sendSuccess, handleServiceError } from '../../utils/response';
import { parsePagination } from '../../utils/pagination';
import * as faqService from '../../services/admin/faqService';

export async function getFaqs(req: Request, res: Response): Promise<void> {
  const { page, limit } = parsePagination(req, 100);
  const search      = req.query.search  ? String(req.query.search)  : undefined;
  const sortBy      = req.query.sortBy  ? String(req.query.sortBy)  : undefined;
  const sortOrder   = req.query.sortOrder === 'desc' ? 'DESC' : 'ASC';
  const isActiveRaw = req.query.isActive;
  const isActive    = isActiveRaw === 'true' ? true : isActiveRaw === 'false' ? false : undefined;

  const { rows, count } = await faqService.listFaqs(
    { search, isActive, sortBy, sortOrder },
    page,
    limit,
  );
  sendSuccess(res, { faqs: rows, total: count, page, limit }, 'FAQs fetched');
}

export async function addFaq(req: Request, res: Response): Promise<void> {
  try {
    const faq = await faqService.createFaq(req.body as Parameters<typeof faqService.createFaq>[0]);
    sendSuccess(res, { faq }, 'FAQ created', 201);
  } catch (err: unknown) {
    handleServiceError(err, res, 'Failed to create FAQ');
  }
}

export async function editFaq(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    const faq = await faqService.updateFaq(id, req.body as Parameters<typeof faqService.updateFaq>[1]);
    sendSuccess(res, { faq }, 'FAQ updated');
  } catch (err: unknown) {
    handleServiceError(err, res, 'Failed to update FAQ');
  }
}

export async function removeFaq(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id);
    await faqService.deleteFaq(id);
    sendSuccess(res, null, 'FAQ deleted');
  } catch (err: unknown) {
    handleServiceError(err, res, 'Failed to delete FAQ');
  }
}
