export interface Seller {
  id: string;
  mobile: string;
  countryCode: string;
  fullName: string | null;
  businessName?: string | null;
  isVerified: boolean;
  isActive: boolean;
}

export interface AuthState {
  seller: Seller | null;
  token: string | null;
}

export type AttributeFieldType = 'text' | 'textarea' | 'number' | 'select' | 'multiselect' | 'color';

export interface AttributeFieldOption {
  label: string;
  value: string;
  hex?: string;
}

export interface AttributeField {
  key: string;
  label: string;
  type: AttributeFieldType;
  required: boolean;
  isVariant?: boolean;
  unit?: string;
  options?: AttributeFieldOption[];
}

export interface SellerCategory {
  id: number;
  name: string;
  slug: string;
  attributeSchema?: AttributeField[];
}

export interface ImageAnalysisResult {
  imageUrl: string;
  suggestions: {
    name: string | null;
    description: string | null;
    categoryId: number | null;
    categorySlug: string | null;
    categoryName: string | null;
    confidence: 'high' | 'medium' | 'low';
    attributes: Record<string, unknown>;
  } | null;
  attributeSchema: AttributeField[];
}

export interface SellerProfile {
  id: number;
  businessName: string | null;
  email: string | null;
  bio: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  lat: number | null;
  long: number | null;
  categoryIds: number[];
  categories: SellerCategory[];
  workingHours: Record<string, unknown> | null;
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
  category?: SellerCategory;
  attributes?: Record<string, unknown>;
  variants?: Array<{ id: string }>;
  pickupAddress?: string | null;
  createdAt: string;
}

export interface ProductsResponse {
  products: Product[];
  total: number;
  page: number;
  limit: number;
}

export interface DashboardStats {
  totalViews: number;
  viewsGrowthPercent: number;
  wishlistSaves: number;
  wishlistGrowthPercent: number;
  totalProducts: number;
  productsAddedThisWeek: number;
  interestRate: number;
  interestRateGrowthPercent: number;
}

export interface ProductVariant {
  id: string;
  productId: string;
  attributes: Record<string, unknown>;
  images: string[];
  stock: number;
  sellingPrice: number;
  mrp: number | null;
  isActive: boolean;
  createdAt: string;
}
