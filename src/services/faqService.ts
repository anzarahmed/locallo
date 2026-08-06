import { apiGet } from '../lib/axios';
import { PATHS } from '../api/paths';
import type { Faq } from '../types';

export function getFaqs(): Promise<{ faqs: Faq[] }> {
  return apiGet<{ faqs: Faq[] }>(PATHS.FAQS);
}
