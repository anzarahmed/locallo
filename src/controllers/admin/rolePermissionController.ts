import type { Request, Response } from 'express';
import { getRolePermissions, setRolePermissions, getMyPermissions } from '../../services/admin/rolePermissionService';
import { sendSuccess, sendError } from '../../utils/response';
import type { PermissionModule, PermissionAction } from '../../types';

export async function fetchRolePermissions(req: Request, res: Response): Promise<void> {
  try {
    const { role } = req.params as { role: string };
    if (role !== 'manager' && role !== 'operator') {
      sendError(res, 'Role must be manager or operator', 400);
      return;
    }
    const map = await getRolePermissions(role);
    sendSuccess(res, map);
  } catch {
    sendError(res, 'Internal server error');
  }
}

export async function saveRolePermissions(req: Request, res: Response): Promise<void> {
  try {
    const { role } = req.params as { role: string };
    if (role !== 'manager' && role !== 'operator') {
      sendError(res, 'Role must be manager or operator', 400);
      return;
    }
    const { permissions } = req.body as {
      permissions: { module: PermissionModule; action: PermissionAction }[];
    };
    const map = await setRolePermissions(role, permissions);
    sendSuccess(res, map, 'Permissions updated');
  } catch {
    sendError(res, 'Internal server error');
  }
}

export async function fetchMyPermissions(req: Request, res: Response): Promise<void> {
  try {
    const map = await getMyPermissions(req.admin!.role);
    sendSuccess(res, map);
  } catch {
    sendError(res, 'Internal server error');
  }
}
