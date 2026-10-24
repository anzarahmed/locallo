import type { Request, Response } from 'express';
import { registerPushToken, clearPushToken } from '../../services/notifications/pushTokenService';
import { sendSuccess, handleServiceError } from '../../utils/response';

export async function savePushToken(req: Request, res: Response): Promise<void> {
  try {
    await registerPushToken(req.sessionId!, String(req.body.token).trim());
    sendSuccess(res, null, 'Push token saved');
  } catch (err: unknown) {
    handleServiceError(err, res);
  }
}

export async function removePushToken(req: Request, res: Response): Promise<void> {
  try {
    await clearPushToken(req.sessionId!);
    sendSuccess(res, null, 'Push token removed');
  } catch (err: unknown) {
    handleServiceError(err, res);
  }
}
