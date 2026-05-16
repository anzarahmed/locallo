import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Admin } from '../models/Admin';
import { User } from '../models/User';

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

  const user = await User.findByPk(payload.id);
  if (!user || !user.isActive) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  req.customer = user;
  next();
}
