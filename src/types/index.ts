export type AdminRole = 'super_admin' | 'manager' | 'operator';
export type SellerStatus = 'active' | 'inactive' | 'pending';

export interface Admin {
  readonly id: number;
  readonly email: string;
  readonly name: string;
  readonly role: AdminRole;
}

export interface Seller {
  readonly id: number;
  name: string;
  email: string;
  phone: string;
  businessName: string;
  status: SellerStatus;
  createdAt: string;
  latitude?: number;
  longitude?: number;
}

export interface AuthState {
  admin: Admin | null;
  token: string | null;
}
