export type AdminRole = 'super_admin' | 'manager' | 'operator';
export type SellerStatus = 'active' | 'inactive' | 'pending';

export interface Admin {
  readonly id: number;
  readonly email: string;
  readonly name: string;
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
