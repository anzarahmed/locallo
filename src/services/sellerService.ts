import { apiPost, apiGet, apiPut, apiPatch } from '../lib/axios';
import { PATHS } from '../api/paths';
import type { WorkingHours } from '../types';
import type { SellerFormValues } from '../pages/sellers/sellerSchemas';

interface CreateSellerResponse {
  id: string;
  mobile: string;
  countryCode: string;
  fullName: string | null;
  isActive: boolean;
}

export interface SellerProfile {
  businessName: string;
  email: string;
  lat: number | string;
  long: number | string;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  categoryId: number | null;
  category: { id: number; name: string; slug: string } | null;
  bio: string | null;
  workingHours: WorkingHours | null;
}

export interface Seller {
  id: string;
  mobile: string;
  countryCode: string | null;
  fullName: string | null;
  businessName: string | null;
  email: string | null;
  isActive: boolean;
  profile: SellerProfile | null;
}

interface PaginationData {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface GetSellersResponse {
  sellers: Seller[];
  pagination: PaginationData;
}

export function createSeller(values: SellerFormValues): Promise<CreateSellerResponse> {
  return apiPost<CreateSellerResponse>(PATHS.SELLERS.CREATE, {
    mobile:       values.mobile,
    countryCode:  values.countryCode,
    fullName:     values.ownerName,
    businessName: values.shopName,
    email:        values.email,
    lat:          values.latitude,
    long:         values.longitude,
    categoryId:   values.categoryId,
    bio:          values.bio,
    workingHours: values.workingHours ?? null,
  });
}

export interface SellerListParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  fullName?: string;
  businessName?: string;
  mobile?: string;
  isActive?: 'true' | 'false';
  categoryId?: number;
}

export function getSellerList(params: SellerListParams): Promise<GetSellersResponse> {
  const q = new URLSearchParams();
  q.set('page', String(params.page));
  q.set('limit', String(params.limit));
  if (params.sortBy)       q.set('sortBy',       params.sortBy);
  if (params.sortOrder)    q.set('sortOrder',     params.sortOrder);
  if (params.fullName)     q.set('fullName',      params.fullName);
  if (params.businessName) q.set('businessName',  params.businessName);
  if (params.mobile)       q.set('mobile',        params.mobile);
  if (params.isActive)     q.set('isActive',      params.isActive);
  if (params.categoryId)   q.set('categoryId',    String(params.categoryId));
  return apiGet<GetSellersResponse>(`${PATHS.SELLERS.LIST}?${q}`);
}

export function getSellerById(id: string): Promise<Seller> {
  return apiGet<Seller>(PATHS.SELLERS.BY_ID(id));
}

export function toggleSellerStatus(id: string): Promise<{ id: string; isActive: boolean }> {
  return apiPatch<{ id: string; isActive: boolean }>(PATHS.SELLERS.STATUS(id), {});
}

export function updateSeller(id: string, values: SellerFormValues): Promise<Seller> {
  return apiPut<Seller>(PATHS.SELLERS.BY_ID(id), {
    mobile:       values.mobile,
    countryCode:  values.countryCode,
    fullName:     values.ownerName,
    businessName: values.shopName,
    email:        values.email,
    lat:          values.latitude,
    long:         values.longitude,
    categoryId:   values.categoryId,
    bio:          values.bio,
    workingHours: values.workingHours ?? null,
  });
}