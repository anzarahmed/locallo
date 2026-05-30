import { RolePermission } from '../../models/RolePermission';
import type { PermissionMap, PermissionModule, PermissionAction } from '../../types';

function buildMap(rows: RolePermission[]): PermissionMap {
  const map: PermissionMap = {};
  for (const row of rows) {
    if (!map[row.module]) map[row.module] = [];
    map[row.module]!.push(row.action);
  }
  return map;
}

const ALL_MODULES: PermissionModule[] = ['sellers', 'categories', 'products'];
const ALL_ACTIONS: PermissionAction[] = ['list', 'view', 'add', 'edit', 'delete'];

export async function getRolePermissions(role: 'manager' | 'operator'): Promise<PermissionMap> {
  const rows = await RolePermission.findAll({ where: { role } });
  return buildMap(rows);
}

export async function setRolePermissions(
  role: 'manager' | 'operator',
  entries: { module: PermissionModule; action: PermissionAction }[],
): Promise<PermissionMap> {
  await RolePermission.destroy({ where: { role } });

  if (entries.length > 0) {
    const now = new Date();
    await RolePermission.bulkCreate(
      entries.map(e => ({ role, module: e.module, action: e.action, createdAt: now, updatedAt: now })),
    );
  }

  const rows = await RolePermission.findAll({ where: { role } });
  return buildMap(rows);
}

export async function getMyPermissions(role: string): Promise<PermissionMap> {
  if (role === 'super_admin') {
    const map: PermissionMap = {};
    for (const m of ALL_MODULES) map[m] = [...ALL_ACTIONS];
    return map;
  }
  if (role !== 'manager' && role !== 'operator') return {};
  return getRolePermissions(role);
}
