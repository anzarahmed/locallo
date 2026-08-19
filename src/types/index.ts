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
}

export interface AttributeField {
  key: string;
  label: string;
  type: AttributeFieldType;
  required: boolean;
  isVariant?: boolean;
  isStockDependent?: boolean;
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
  photo: string | null;
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
  thumbnails: string[];
  isActive: boolean;
  categoryId: number;
  category?: SellerCategory;
  attributes?: Record<string, unknown>;
  variants?: Array<{ id: string }>;
  variantCount?: number;
  pickupAddress?: string | null;
  createdAt: string;
}

export interface TopProduct {
  id: string;
  title: string;
  image: string | null;
  totalStock: number;
  isActive: boolean;
}

export interface SoldLog {
  id: string;
  productId: string | null;
  variantId: string | null;
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  productName: string;
  variantInfo: Record<string, unknown> | null;
  soldAt: string;
  productImage: string | null;
}

export interface SoldLogsResponse {
  logs: SoldLog[];
  total: number;
  page: number;
  limit: number;
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
  avgRating: number;
  reviewCount: number;
}

export interface CustomDayTime {
  open: string;
  close: string;
  isClosed: boolean;
}

export interface CustomDayOverride {
  date: string;
  time: CustomDayTime;
}

export type OfferType = 'percentage_off' | 'flat_amount_off' | 'bogo';

export interface PercentageOffConfig {
  discountPercent: number;
  maxDiscountCap?: number;
}

export interface FlatAmountOffConfig {
  flatAmount: number;
}

export interface BogoConfig {
  buyQty: number;
  getQty: number;
  getDiscountPercent: number;
}

export type OfferConfig = PercentageOffConfig | FlatAmountOffConfig | BogoConfig;

export interface Offer {
  id: number;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  offerType: OfferType;
  config: OfferConfig;
  isActive: boolean;
  hasStarted: boolean;
}

export type BoostAudienceType = 'pan_india' | 'state' | 'city';
export type BoostStatus = 'active' | 'completed' | 'cancelled';

export interface ProductBoost {
  id: string;
  productId: string;
  audienceType: BoostAudienceType;
  state: string | null;
  city: string | null;
  dailyBudget: number;
  estimatedImpressionsMin: number;
  estimatedImpressionsMax: number;
  status: BoostStatus;
  createdAt: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  referenceType: string | null;
  referenceId: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  total: number;
  page: number;
  limit: number;
}

export interface OffersResponse {
  offers: Offer[];
  total: number;
  page: number;
  limit: number;
}

export interface AcceptedOffer extends Offer {
  acceptedCount: number;
}

export interface AcceptedOffersResponse {
  offers: AcceptedOffer[];
  total: number;
  page: number;
  limit: number;
}

export interface OfferDetailResponse {
  offer: Offer;
  acceptedProducts: Product[];
  acceptedProductIds: string[];
}

export interface ProductVariant {
  id: string;
  productId: string;
  attributes: Record<string, unknown>;
  images: string[];
  thumbnails: string[];
  stock: number;
  sellingPrice: number;
  mrp: number | null;
  isActive: boolean;
  createdAt: string;
}
