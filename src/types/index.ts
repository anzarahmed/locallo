export type AdminRole = 'super_admin' | 'manager' | 'operator';
export type UserRole = 'CUSTOMER' | 'SELLER';
export type ActorType = 'user' | 'admin';

export type PermissionModule = 'sellers' | 'categories' | 'products';
export type PermissionAction = 'list' | 'view' | 'add' | 'edit' | 'delete';
export type PermissionMap = Partial<Record<PermissionModule, PermissionAction[]>>;

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
