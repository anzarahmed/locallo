import bcrypt from 'bcrypt';
import { Op } from 'sequelize';
import { Admin } from '../../models/Admin';
import type { AdminRole } from '../../types';

export interface SubAdminRow {
  id: string;
  email: string;
  fullName: string | null;
  role: AdminRole;
  isActive: boolean;
  createdAt: Date;
}

function toRow(admin: Admin): SubAdminRow {
  return {
    id: admin.id,
    email: admin.email,
    fullName: admin.fullName,
    role: admin.role,
    isActive: admin.isActive,
    createdAt: admin.createdAt,
  };
}

export async function listSubAdmins(
  page: number,
  limit: number,
): Promise<{ rows: SubAdminRow[]; total: number }> {
  const { rows, count } = await Admin.findAndCountAll({
    where: { role: { [Op.in]: ['manager', 'operator'] } },
    order: [['createdAt', 'DESC']],
    limit,
    offset: (page - 1) * limit,
  });
  return { rows: rows.map(toRow), total: count };
}

export async function createSubAdmin(data: {
  email: string;
  password: string;
  fullName: string | null;
  role: 'manager' | 'operator';
  createdById: string;
}): Promise<SubAdminRow> {
  const existing = await Admin.findOne({ where: { email: data.email } });
  if (existing) {
    throw Object.assign(new Error('An admin with that email already exists'), { status: 409 });
  }

  const passwordHash = await bcrypt.hash(data.password, 12);
  const admin = await Admin.create({
    email: data.email,
    passwordHash,
    fullName: data.fullName,
    role: data.role,
    managedBy: data.createdById,
    isActive: true,
  });

  return toRow(admin);
}

export async function updateSubAdmin(
  id: string,
  data: {
    email: string;
    password: string | null;
    fullName: string | null;
    role: 'manager' | 'operator';
  },
): Promise<SubAdminRow> {
  const admin = await Admin.findByPk(id);
  if (!admin || admin.role === 'super_admin') {
    throw Object.assign(new Error('Sub-admin not found'), { status: 404 });
  }

  const emailTaken = await Admin.findOne({ where: { email: data.email, id: { [Op.ne]: id } } });
  if (emailTaken) {
    throw Object.assign(new Error('An admin with that email already exists'), { status: 409 });
  }

  const updates: Partial<{ email: string; fullName: string | null; role: string; passwordHash: string }> = {
    email: data.email,
    fullName: data.fullName,
    role: data.role,
  };

  if (data.password) {
    updates.passwordHash = await bcrypt.hash(data.password, 12);
  }

  await admin.update(updates);
  return toRow(admin);
}

export async function deleteSubAdmin(id: string, requesterId: string): Promise<void> {
  if (id === requesterId) {
    throw Object.assign(new Error('You cannot delete your own account'), { status: 400 });
  }

  const admin = await Admin.findByPk(id);
  if (!admin || admin.role === 'super_admin') {
    throw Object.assign(new Error('Sub-admin not found'), { status: 404 });
  }

  await admin.destroy();
}

export async function toggleSubAdminStatus(id: string, requesterId: string): Promise<SubAdminRow> {
  if (id === requesterId) {
    throw Object.assign(new Error('You cannot deactivate your own account'), { status: 400 });
  }

  const admin = await Admin.findByPk(id);
  if (!admin || admin.role === 'super_admin') {
    throw Object.assign(new Error('Sub-admin not found'), { status: 404 });
  }

  await admin.update({ isActive: !admin.isActive });
  return toRow(admin);
}
