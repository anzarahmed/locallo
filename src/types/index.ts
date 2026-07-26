export type AdminRole = 'super_admin' | 'manager' | 'operator';
export type PermissionModule = 'sellers' | 'categories' | 'products' | 'customers' | 'brands' | 'banners';
export type PermissionAction = 'list' | 'view' | 'add' | 'edit' | 'delete';
export type PermissionMap = Partial<Record<PermissionModule, PermissionAction[]>>;
export type SellerStatus = 'active' | 'inactive' | 'pending';
export type KycDocumentType = 'aadhar' | 'pan' | 'registrationCertificate' | 'other';

export interface KycDocuments {
  aadhar: string | null;
  pan: string | null;
  registrationCertificate: string | null;
  other: string | null;
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

export interface Category {
  readonly id: number;
  name: string;
  slug: string;
  isActive: boolean;
  attributeSchema?: AttributeField[] | null;
  icon?: string | null;
}

export interface Brand {
  readonly id: number;
  name: string;
  slug: string;
  isActive: boolean;
  logo?: string | null;
}

export interface Banner {
  readonly id: number;
  brandId: number;
  brand?: { id: number; name: string; slug: string };
  image: string;
  title: string | null;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface Admin {
  readonly id: string;
  readonly email: string;
  readonly role: AdminRole;
}

export interface DaySchedule {
  isClosed: boolean;
  open: string;
  close: string;
}

export type WorkingHours = Record<
  'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday',
  DaySchedule
>;

export interface Seller {
  readonly id: number;
  ownerName: string;
  shopName: string;
  email: string;
  mobile: string;
  category: string;
  bio: string;
  workingHours?: WorkingHours;
  status: SellerStatus;
  createdAt: string;
  latitude?: number;
  longitude?: number;
}

export interface AuthState {
  admin: Admin | null;
  token: string | null;
}

export interface ProductCategory {
  id: number;
  name: string;
  slug: string;
  attributeSchema?: AttributeField[];
}

export interface ProductSeller {
  id: string;
  fullName: string | null;
  mobile: string;
  sellerProfile: { businessName: string } | null;
}

export interface ProductVariant {
  id: string;
  productId: string;
  attributes: Record<string, unknown>;
  images: string[];
  thumbnails: string[];
  stock: number;
  sellingPrice: number | string | null;
  mrp: number | string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  sellerId: string;
  categoryId: number;
  name: string;
  description: string;
  sellingPrice: number | string;
  mrp: number | string | null;
  costPrice: number | string | null;
  stock: number;
  images: string[];
  thumbnails: string[];
  attributes: Record<string, unknown>;
  pickupAddress: string | null;
  pickupLat: number | string | null;
  pickupLong: number | string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  seller?: ProductSeller;
  category?: ProductCategory;
  variants?: ProductVariant[];
}
