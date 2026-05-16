import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Admin } from '../../models/Admin';

interface LoginResult {
  token: string;
  admin: {
    id: string;
    email: string;
    role: string;
  };
}

export async function loginAdmin(email: string, password: string): Promise<LoginResult> {
  const admin = await Admin.findOne({ where: { email } });

  if (!admin || !admin.isActive) {
    throw Object.assign(new Error('Invalid credentials'), { status: 401 });
  }

  const passwordMatch = await bcrypt.compare(password, admin.passwordHash);
  if (!passwordMatch) {
    throw Object.assign(new Error('Invalid credentials'), { status: 401 });
  }

  const token = jwt.sign(
    { id: admin.id, role: admin.role },
    process.env.JWT_SECRET as string,
    { expiresIn: '7d' },
  );

  return {
    token,
    admin: { id: admin.id, email: admin.email, role: admin.role },
  };
}
