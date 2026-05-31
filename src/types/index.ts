export interface Seller {
  id: string;
  mobile: string;
  countryCode: string;
  fullName: string | null;
  isVerified: boolean;
  isActive: boolean;
}

export interface AuthState {
  seller: Seller | null;
  token: string | null;
}

export interface SellerCategory {
  id: number;
  name: string;
  slug: string;
}

export interface SellerProfile {
  id: number;
  businessName: string | null;
  bio: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  lat: number | null;
  long: number | null;
  categoryIds: number[];
  categories: SellerCategory[];
  isVerified: boolean;
  isActive: boolean;
}

export interface ProfileResponse {
  id: string;
  mobile: string;
  countryCode: string;
  fullName: string | null;
  isActive: boolean;
  profile: SellerProfile;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  sellingPrice: number;
  mrp: number | null;
  costPrice: number | null;
  stock: number;
  images: string[];
  isActive: boolean;
  categoryId: number;
  createdAt: string;
}

export interface ProductsResponse {
  products: Product[];
  total: number;
  page: number;
  limit: number;
}
