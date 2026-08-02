import { apiGet, apiPost, apiPut, apiDelete } from '../lib/axios';
import { PATHS } from '../api/paths';
import type { Faq } from '../types';

export interface GetFaqsPaginatedParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface GetFaqsPaginatedResponse {
  faqs: Faq[];
  total: number;
  page: number;
  limit: number;
}

interface FaqPayload {
  question: string;
  answer: string;
}

interface UpdateFaqPayload {
  question?: string;
  answer?: string;
  isActive?: boolean;
}

export function getFaqsPaginated(
  params: GetFaqsPaginatedParams = {},
): Promise<GetFaqsPaginatedResponse> {
  const q = new URLSearchParams();
  if (params.page)       q.set('page',       String(params.page));
  if (params.limit)      q.set('limit',      String(params.limit));
  if (params.search)     q.set('search',     params.search);
  if (params.isActive !== undefined) q.set('isActive', String(params.isActive));
  if (params.sortBy)    q.set('sortBy',    params.sortBy);
  if (params.sortOrder) q.set('sortOrder', params.sortOrder);
  const url = q.toString() ? `${PATHS.FAQS.LIST}?${q}` : PATHS.FAQS.LIST;
  return apiGet<GetFaqsPaginatedResponse>(url);
}

export function createFaq(data: FaqPayload): Promise<Faq> {
  return apiPost<{ faq: Faq }>(PATHS.FAQS.LIST, data).then(r => r.faq);
}

export function updateFaq(id: number, data: UpdateFaqPayload): Promise<Faq> {
  return apiPut<{ faq: Faq }>(PATHS.FAQS.BY_ID(id), data).then(r => r.faq);
}

export function deleteFaq(id: number): Promise<void> {
  return apiDelete<null>(PATHS.FAQS.BY_ID(id)).then(() => undefined);
}
