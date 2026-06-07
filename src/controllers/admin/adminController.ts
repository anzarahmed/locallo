import type { Request, Response } from 'express';
import { loginAdmin, forgotAdminPassword, resetAdminPassword } from '../../services/admin/adminService';
import { sendSuccess, handleServiceError } from '../../utils/response';

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body as { email: string; password: string };
    const result = await loginAdmin(email, password);
    sendSuccess(res, result, 'Login successful');
  } catch (err: unknown) {
    handleServiceError(err, res);
  }
}

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  try {
    const { email } = req.body as { email: string };
    await forgotAdminPassword(email);
    sendSuccess(res, null, 'If that email exists, a reset link has been sent');
  } catch (err: unknown) {
    console.error('[forgotPassword]', err);
    handleServiceError(err, res);
  }
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  try {
    const { token, password } = req.body as { token: string; password: string };
    await resetAdminPassword(token, password);
    sendSuccess(res, null, 'Password reset successfully');
  } catch (err: unknown) {
    handleServiceError(err, res);
  }
}
