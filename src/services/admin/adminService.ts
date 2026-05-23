import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Admin } from '../../models/Admin';
import { sendPasswordResetEmail } from '../../utils/mailer';

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

export async function forgotAdminPassword(email: string): Promise<void> {
  const admin = await Admin.findOne({ where: { email, isActive: true } });

  if (!admin) {
    throw Object.assign(new Error('No account found with that email'), { status: 404 });
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  await admin.update({
    resetToken: tokenHash,
    resetTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
  });

  const resetUrl = `${process.env.ADMIN_PANEL_URL}/reset-password?token=${rawToken}`;
  await sendPasswordResetEmail(email, resetUrl);
}

export async function resetAdminPassword(rawToken: string, newPassword: string): Promise<void> {
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  const admin = await Admin.findOne({ where: { resetToken: tokenHash } });

  if (
    !admin ||
    !admin.resetTokenExpiresAt ||
    admin.resetTokenExpiresAt < new Date()
  ) {
    throw Object.assign(new Error('Invalid or expired reset token'), { status: 400 });
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await admin.update({ passwordHash, resetToken: null, resetTokenExpiresAt: null });
}
