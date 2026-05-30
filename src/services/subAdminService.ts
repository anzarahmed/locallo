import { apiGet, apiPost, apiPut, apiDelete, apiPatch } from '../lib/axios';
import { PATHS } from '../api/paths';
import type { AdminRole } from '../types';

export interface SubAdmin {
  id: string;
  email: string;
  fullName: string | null;
  role: AdminRole;
  isActive: boolean;
  createdAt: string;
}

export interface ListSubAdminsResponse {
  rows: SubAdmin[];
  total: number;
}

export function listSubAdmins(page: number, limit: number): Promise<ListSubAdminsResponse> {
  return apiGet<ListSubAdminsResponse>(`${PATHS.SUB_ADMINS.LIST}?page=${page}&limit=${limit}`);
}

export function createSubAdmin(data: {
  email: string;
  password: string;
  fullName: string | null;
  role: 'manager' | 'operator';
}): Promise<SubAdmin> {
  return apiPost<SubAdmin>(PATHS.SUB_ADMINS.CREATE, data);
}

export function updateSubAdmin(
  id: string,
  data: {
    email: string;
    password: string | null;
    fullName: string | null;
    role: 'manager' | 'operator';
  },
): Promise<SubAdmin> {
  return apiPut<SubAdmin>(PATHS.SUB_ADMINS.BY_ID(id), data);
}

export function deleteSubAdmin(id: string): Promise<void> {
  return apiDelete<void>(PATHS.SUB_ADMINS.BY_ID(id));
}

export function toggleSubAdminStatus(id: string): Promise<SubAdmin> {
  return apiPatch<SubAdmin>(PATHS.SUB_ADMINS.STATUS(id), {});
}
