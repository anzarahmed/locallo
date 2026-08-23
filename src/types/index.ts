export type AdminRole = 'super_admin' | 'manager' | 'operator';
export type UserRole = 'CUSTOMER' | 'SELLER';
export type Gender = 'male' | 'female' | 'other';
export type ActorType = 'user' | 'admin';

export type PermissionModule = 'sellers' | 'categories' | 'products' | 'customers' | 'brands' | 'banners' | 'faqs' | 'cmsPages' | 'offers';
export type PermissionAction = 'list' | 'view' | 'add' | 'edit' | 'delete';
export type PermissionMap = Partial<Record<PermissionModule, PermissionAction[]>>;

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

export interface NotificationSettings {
  pushNotifications: boolean;
  emailUpdates: boolean;
  smsAlerts: boolean;
  offersAndPromotions: boolean;
  wishlistPriceDrops: boolean;
  sellerUpdates: boolean;
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

export type KycDocumentType = 'aadhar' | 'pan' | 'registrationCertificate' | 'other';

export interface KycDocuments {
  aadhar: string | null;
  pan: string | null;
  registrationCertificate: string | null;
  other: string | null;
}

export type BrandDocumentType = 'certification' | 'other';

export interface BrandDocumentSet {
  certification: string | null;
  other: string | null;
}

export type BrandDocuments = Record<string, BrandDocumentSet>;

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

export type BoostAudienceType = 'pan_india' | 'state' | 'city';
export type BoostStatus = 'active' | 'completed' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'failed';
