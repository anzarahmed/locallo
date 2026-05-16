import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Admin } from '../models/Admin';

interface JwtPayload {
  id: string;
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
