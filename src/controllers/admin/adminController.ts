import type { Request, Response } from 'express';
import { loginAdmin, forgotAdminPassword, resetAdminPassword } from '../../services/admin/adminService';
import { sendSuccess, sendError } from '../../utils/response';

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body as { email: string; password: string };
    const result = await loginAdmin(email, password);
    sendSuccess(res, result, 'Login successful');
  } catch (err: unknown) {
    const status = (err as { status?: number }).status;
    if (status === 401) {
      sendError(res, (err as Error).message, 401);
      return;
    }
    sendError(res, 'Internal server error');
  }
}

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  try {
    const { email } = req.body as { email: string };
    await forgotAdminPassword(email);
    sendSuccess(res, null, 'If that email exists, a reset link has been sent');
  } catch (err: unknown) {
    const status = (err as { status?: number }).status;
    if (status === 404) {
      sendError(res, (err as Error).message, 404);
      return;
    }
    console.error('[forgotPassword]', err);
    sendError(res, 'Internal server error');
  }
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  try {
    const { token, password } = req.body as { token: string; password: string };
    await resetAdminPassword(token, password);
    sendSuccess(res, null, 'Password reset successfully');
  } catch (err: unknown) {
    const status = (err as { status?: number }).status;
    if (status === 400) {
      sendError(res, (err as Error).message, 400);
      return;
    }
    sendError(res, 'Internal server error');
  }
}
