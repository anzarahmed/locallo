import { apiGet, apiPost, apiPut, apiDelete, apiPatch } from '../lib/axios';
import { PATHS } from '../api/paths';
import type { Offer, OfferConfig, OfferType } from '../types';

export interface GetOffersPaginatedParams {
  page?: number;
  limit?: number;
  isActive?: boolean;
  offerType?: OfferType;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface GetOffersPaginatedResponse {
  offers: Offer[];
  total: number;
  page: number;
  limit: number;
}

interface OfferPayload {
  title: string;
  description?: string | null;
  startDate: string;
  endDate: string;
  offerType: OfferType;
  config: OfferConfig;
}

interface UpdateOfferPayload {
  title?: string;
  description?: string | null;
  startDate?: string;
  endDate?: string;
  offerType?: OfferType;
  config?: OfferConfig;
  isActive?: boolean;
}

export function getOffersPaginated(
  params: GetOffersPaginatedParams = {},
): Promise<GetOffersPaginatedResponse> {
  const q = new URLSearchParams();
  if (params.page)      q.set('page',      String(params.page));
  if (params.limit)     q.set('limit',     String(params.limit));
  if (params.isActive !== undefined) q.set('isActive', String(params.isActive));
  if (params.offerType) q.set('offerType', params.offerType);
  if (params.search)    q.set('search',    params.search);
  if (params.sortBy)    q.set('sortBy',    params.sortBy);
  if (params.sortOrder) q.set('sortOrder', params.sortOrder);
  const url = q.toString() ? `${PATHS.OFFERS.LIST}?${q}` : PATHS.OFFERS.LIST;
  return apiGet<GetOffersPaginatedResponse>(url);
}

export function createOffer(data: OfferPayload): Promise<Offer> {
  return apiPost<{ offer: Offer }>(PATHS.OFFERS.LIST, data).then(r => r.offer);
}

export function updateOffer(id: number, data: UpdateOfferPayload): Promise<Offer> {
  return apiPut<{ offer: Offer }>(PATHS.OFFERS.BY_ID(id), data).then(r => r.offer);
}

export function toggleOffer(id: number): Promise<Offer> {
  return apiPatch<{ offer: Offer }>(PATHS.OFFERS.TOGGLE(id), {}).then(r => r.offer);
}

export function deleteOffer(id: number): Promise<void> {
  return apiDelete<null>(PATHS.OFFERS.BY_ID(id)).then(() => undefined);
}
