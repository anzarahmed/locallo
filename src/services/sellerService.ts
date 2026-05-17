import { apiPost, apiGet, apiPut } from '../lib/axios';
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
  category: string | null;
  bio: string | null;
  workingHours: WorkingHours | null;
}

export interface Seller {
  id: string;
  mobile: string;
  countryCode: string | null;
  fullName: string | null;
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
    category:     values.category,
    bio:          values.bio,
    workingHours: values.workingHours ?? null,
  });
}

export function getSellerList(page: number, limit: number, search?: string): Promise<GetSellersResponse> {
  let url = `${PATHS.SELLERS.LIST}?page=${page}&limit=${limit}`;
  if (search && search.trim() !== '') {
    url += `&search=${encodeURIComponent(search.trim())}`;
  }
  return apiGet<GetSellersResponse>(url);
}

export function getSellerById(id: string): Promise<Seller> {
  return apiGet<Seller>(PATHS.SELLERS.BY_ID(id));
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
    category:     values.category,
    bio:          values.bio,
    workingHours: values.workingHours ?? null,
  });
}