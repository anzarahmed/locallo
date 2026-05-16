import type { Request, Response } from 'express';
import { loginAdmin } from '../services/adminService';
import { sendSuccess, sendError } from '../utils/response';

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const data = await loginAdmin(req.body.email, req.body.password);
    sendSuccess(res, data);
  } catch (err: unknown) {
    if ((err as { status?: number }).status === 401) {
      sendError(res, (err as Error).message, 401);
      return;
    }
    sendError(res, 'Internal server error');
  }
}
