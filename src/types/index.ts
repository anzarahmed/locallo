export type AdminRole = 'super_admin' | 'manager' | 'operator';
export type UserRole = 'CUSTOMER' | 'SELLER';
export type ActorType = 'user' | 'admin';

export type PermissionModule = 'sellers' | 'categories' | 'products' | 'customers';
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
