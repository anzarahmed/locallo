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
