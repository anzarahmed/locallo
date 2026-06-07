import type { Request, Response } from 'express';
import {
  listSubAdmins,
  createSubAdmin,
  updateSubAdmin,
  deleteSubAdmin,
  toggleSubAdminStatus,
} from '../../services/admin/subAdminService';
import { sendSuccess, handleServiceError } from '../../utils/response';
import { parsePagination } from '../../utils/pagination';

export async function getSubAdmins(req: Request, res: Response): Promise<void> {
  try {
    const { page, limit } = parsePagination(req, 100, 10);
    const result = await listSubAdmins(page, limit);
    sendSuccess(res, result);
  } catch (err: unknown) {
    handleServiceError(err, res);
  }
}

export async function addSubAdmin(req: Request, res: Response): Promise<void> {
  try {
    const { email, password, fullName, role } = req.body as {
      email: string;
      password: string;
      fullName: string | null;
      role: 'manager' | 'operator';
    };
    const admin = await createSubAdmin({
      email,
      password,
      fullName: fullName ?? null,
      role,
      createdById: req.admin!.id,
    });
    sendSuccess(res, admin, 'Sub-admin created', 201);
  } catch (err: unknown) {
    handleServiceError(err, res);
  }
}

export async function editSubAdmin(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    const { email, password, fullName, role } = req.body as {
      email: string;
      password: string | null;
      fullName: string | null;
      role: 'manager' | 'operator';
    };
    const admin = await updateSubAdmin(id, { email, password: password ?? null, fullName: fullName ?? null, role });
    sendSuccess(res, admin, 'Sub-admin updated');
  } catch (err: unknown) {
    handleServiceError(err, res);
  }
}

export async function removeSubAdmin(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    await deleteSubAdmin(id, req.admin!.id);
    sendSuccess(res, null, 'Sub-admin deleted');
  } catch (err: unknown) {
    handleServiceError(err, res);
  }
}

export async function patchSubAdminStatus(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    const admin = await toggleSubAdminStatus(id, req.admin!.id);
    sendSuccess(res, admin, `Sub-admin ${admin.isActive ? 'activated' : 'deactivated'}`);
  } catch (err: unknown) {
    handleServiceError(err, res);
  }
}
