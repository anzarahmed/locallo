import type { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import { listPublicFaqs } from '../../services/customer/faqService';

export async function getFaqs(_req: Request, res: Response): Promise<void> {
  const faqs = await listPublicFaqs();
  sendSuccess(res, { faqs }, 'FAQs fetched');
}
