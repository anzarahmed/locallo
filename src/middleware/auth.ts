import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Admin } from '../models/Admin';
import { User } from '../models/User';
import { Session } from '../models/Session';
import { RolePermission } from '../models/RolePermission';
import { hashToken } from '../utils/session';
import type { PermissionModule, PermissionAction } from '../types';

interface JwtPayload {
  id: string;
  role?: string;
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const token = header.slice(7);
  let payload: JwtPayload;

  try {
    payload = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
  } catch {
    res.status(401).json({ message: 'Invalid token' });
    return;
  }

  const admin = await Admin.findByPk(payload.id);
  if (!admin || !admin.isActive) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  req.admin = admin;
  next();
}

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.admin?.role !== 'super_admin') {
    res.status(403).json({ success: false, message: 'Forbidden' });
    return;
  }
  next();
}

export function requirePermission(module: PermissionModule, action: PermissionAction) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (req.admin?.role === 'super_admin') {
      next();
      return;
    }

    const role = req.admin?.role;
    if (!role) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const row = await RolePermission.findOne({ where: { role, module, action } });
    if (!row) {
      res.status(403).json({ success: false, message: 'Forbidden' });
      return;
    }

    next();
  };
}

export async function requireSeller(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const token = header.slice(7);
  let payload: JwtPayload;

  try {
    payload = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
  } catch {
    res.status(401).json({ message: 'Invalid token' });
    return;
  }

  if (payload.role !== 'SELLER') {
    res.status(403).json({ message: 'Forbidden' });
    return;
  }

  const tokenHash = hashToken(token);
  const session = await Session.findOne({ where: { tokenHash, actorType: 'user' } });
  if (!session) {
    res.status(401).json({ message: 'Session expired or logged out' });
    return;
  }

  const user = await User.findByPk(payload.id);
  if (!user || !user.isActive) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  req.seller = user;
  next();
}

export async function requireCustomer(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const token = header.slice(7);
  let payload: JwtPayload;

  try {
    payload = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
  } catch {
    res.status(401).json({ message: 'Invalid token' });
    return;
  }

  if (payload.role !== 'CUSTOMER') {
    res.status(403).json({ message: 'Forbidden' });
    return;
  }

  const tokenHash = hashToken(token);
  const session = await Session.findOne({ where: { tokenHash, actorType: 'user' } });
  if (!session) {
    res.status(401).json({ message: 'Session expired or logged out' });
    return;
  }

  const user = await User.findByPk(payload.id);
  if (!user || !user.isActive) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  req.customer = user;
  next();
}

export async function optionalCustomer(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    next();
    return;
  }

  const token = header.slice(7);
  let payload: JwtPayload;

  try {
    payload = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
  } catch {
    next();
    return;
  }

  if (payload.role !== 'CUSTOMER') {
    next();
    return;
  }

  const tokenHash = hashToken(token);
  const session = await Session.findOne({ where: { tokenHash, actorType: 'user' } });
  if (!session) {
    next();
    return;
  }

  const user = await User.findByPk(payload.id);
  if (user?.isActive) {
    req.customer = user;
  }
  next();
}
