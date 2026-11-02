import type { Request, Response } from 'express';
import { registerPushToken, clearPushToken } from '../../services/notifications/pushTokenService';
import { queueWelcomePush } from '../../services/notifications/notifyService';
import { sendSuccess, handleServiceError } from '../../utils/response';

export async function savePushToken(req: Request, res: Response): Promise<void> {
  try {
    await registerPushToken(req.sessionId!, String(req.body.token).trim());
    if (req.customer) {
      await queueWelcomePush(req.customer.id).catch((err: unknown) =>
        console.error(`push-token: failed to queue welcome push for ${req.customer?.id}`, err));
    }
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
