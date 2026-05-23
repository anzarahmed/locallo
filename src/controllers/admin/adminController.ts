import type { Request, Response } from 'express';
import { loginAdmin } from '../../services/admin/adminService';
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
