import { apiPost } from '../lib/axios';
import { PATHS } from '../api/paths';
import type { Admin } from '../types';

interface LoginResponse {
  token: string;
  admin: Admin;
}

export function login(email: string, password: string): Promise<LoginResponse> {
  return apiPost<LoginResponse>(PATHS.AUTH.LOGIN, { email, password });
}
