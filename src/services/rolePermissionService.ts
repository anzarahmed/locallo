import { apiGet, apiPut } from '../lib/axios';
import { PATHS } from '../api/paths';
import type { PermissionMap, PermissionModule, PermissionAction } from '../types';

export function getRolePermissions(role: 'manager' | 'operator'): Promise<PermissionMap> {
  return apiGet<PermissionMap>(PATHS.ROLE_PERMISSIONS.BY_ROLE(role));
}

export function saveRolePermissions(
  role: 'manager' | 'operator',
  permissions: { module: PermissionModule; action: PermissionAction }[],
): Promise<PermissionMap> {
  return apiPut<PermissionMap>(PATHS.ROLE_PERMISSIONS.BY_ROLE(role), { permissions });
}
