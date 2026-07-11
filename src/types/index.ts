export type AdminRole = 'super_admin' | 'manager' | 'operator';
export type PermissionModule = 'sellers' | 'categories' | 'products' | 'customers';
export type PermissionAction = 'list' | 'view' | 'add' | 'edit' | 'delete';
export type PermissionMap = Partial<Record<PermissionModule, PermissionAction[]>>;
export type SellerStatus = 'active' | 'inactive' | 'pending';
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
