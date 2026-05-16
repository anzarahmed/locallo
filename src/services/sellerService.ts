import { apiPost } from '../lib/axios';
import { PATHS } from '../api/paths';
import type { SellerFormValues } from '../pages/sellers/sellerSchemas';

interface CreateSellerResponse {
  id: string;
  mobile: string;
  countryCode: string;
  fullName: string | null;
  isActive: boolean;
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
  });
}
