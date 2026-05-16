import type { Admin } from '../models/Admin';
import type { User } from '../models/User';

declare global {
  namespace Express {
    interface Request {
      admin?: Admin;
      seller?: User;
      customer?: User;
    }
  }
}
