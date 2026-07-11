import { apiGet, apiPatch } from '../lib/axios';
import { PATHS } from '../api/paths';

export interface Customer {
  id: string;
  mobile: string;
  countryCode: string | null;
  fullName: string | null;
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
  wishlistCount: number;
}

export interface CustomerWishlistProduct {
  id: string;
  name: string;
  images: string[];
  sellingPrice: number | string;
  mrp: number | string | null;
  isActive: boolean;
}

export interface CustomerWishlistItem {
  id: string;
  createdAt: string;
  product: CustomerWishlistProduct;
}

export interface CustomerDetail {
  id: string;
  mobile: string;
  countryCode: string | null;
  fullName: string | null;
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
  wishlist: CustomerWishlistItem[];
  wishlistTotal: number;
}

export interface CustomerListParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  isVerified?: 'true' | 'false';
  isActive?: 'true' | 'false';
}

export interface GetCustomersResponse {
  customers: Customer[];
  total: number;
  page: number;
  limit: number;
}

export function getCustomerList(params: CustomerListParams): Promise<GetCustomersResponse> {
  const q = new URLSearchParams();
  q.set('page', String(params.page));
  q.set('limit', String(params.limit));
  if (params.sortBy)     q.set('sortBy',     params.sortBy);
  if (params.sortOrder)  q.set('sortOrder',  params.sortOrder);
  if (params.search)     q.set('search',     params.search);
  if (params.isVerified) q.set('isVerified', params.isVerified);
  if (params.isActive)   q.set('isActive',   params.isActive);
  return apiGet<GetCustomersResponse>(`${PATHS.CUSTOMERS.LIST}?${q}`);
}

export function getCustomerById(id: string): Promise<CustomerDetail> {
  return apiGet<CustomerDetail>(PATHS.CUSTOMERS.BY_ID(id));
}

export function toggleCustomerStatus(id: string): Promise<{ id: string; isActive: boolean }> {
  return apiPatch<{ id: string; isActive: boolean }>(PATHS.CUSTOMERS.STATUS(id), {});
}
