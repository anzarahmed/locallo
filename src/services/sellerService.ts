import { apiPost, apiGet } from '../lib/axios'; // Assuming apiGet is available in your axios lib
import { PATHS } from '../api/paths';
import type { SellerFormValues } from '../pages/sellers/sellerSchemas';

interface CreateSellerResponse {
  id: string;
  mobile: string;
  countryCode: string;
  fullName: string | null;
  isActive: boolean;
}

// Target structure matching your backend payload
export interface SellerProfile {
  businessName: string;
  email: string;
  lat: number;
  long: number;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  category: string | null;
  bio: string | null;
  workingHours: string | null;
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
    workingHours: values.workingHours ?? null
  });
}

// Added service function for fetching the paginated list
export function getSellerList(page: number, limit: number, search?: string): Promise<GetSellersResponse> {
  let url = `${PATHS.SELLERS.LIST || '/sellers'}?page=${page}&limit=${limit}`;
  if (search && search.trim() !== '') {
    url += `&search=${encodeURIComponent(search.trim())}`;
  }
  return apiGet<GetSellersResponse>(url);
}