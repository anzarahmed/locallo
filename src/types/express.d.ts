import type { Admin } from '../models/Admin';

declare global {
  namespace Express {
    interface Request {
      admin?: Admin;
    }
  }
}
