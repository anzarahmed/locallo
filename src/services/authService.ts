import { apiPost } from '../lib/axios';
import { PATHS } from '../api/paths';
import type { Admin } from '../types';

interface LoginResponse {
  token: string;
  admin: Admin;
}

export function login(email: string, password: string, captchaToken?: string): Promise<LoginResponse> {
  return apiPost<LoginResponse>(PATHS.AUTH.LOGIN, { email, password, captchaToken });
}

export function forgotPassword(email: string, captchaToken?: string): Promise<null> {
  return apiPost<null>(PATHS.AUTH.FORGOT_PASSWORD, { email, captchaToken });
}

export function resetPassword(token: string, password: string): Promise<null> {
  return apiPost<null>(PATHS.AUTH.RESET_PASSWORD, { token, password });
}
