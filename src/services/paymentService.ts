import { apiGet } from '../lib/axios';
import { PATHS } from '../api/paths';
import type { Payment } from '../types';

export interface GetPaymentsParams {
  page?: number;
  limit?: number;
  sellerId?: string;
  paymentStatus?: string;
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface GetPaymentsResponse {
  payments: Payment[];
  total: number;
  page: number;
  limit: number;
}

export function getPayments(params: GetPaymentsParams = {}): Promise<GetPaymentsResponse> {
  const q = new URLSearchParams();
  if (params.page)          q.set('page',          String(params.page));
  if (params.limit)         q.set('limit',         String(params.limit));
  if (params.sellerId)      q.set('sellerId',      params.sellerId);
  if (params.paymentStatus) q.set('paymentStatus', params.paymentStatus);
  if (params.status)        q.set('status',        params.status);
  if (params.search)        q.set('search',        params.search);
  if (params.sortBy)        q.set('sortBy',        params.sortBy);
  if (params.sortOrder)     q.set('sortOrder',     params.sortOrder);
  const url = q.toString() ? `${PATHS.PAYMENTS.LIST}?${q}` : PATHS.PAYMENTS.LIST;
  return apiGet<GetPaymentsResponse>(url);
}
