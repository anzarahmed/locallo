import type { Request, RequestHandler, Response } from 'express';
import { listTestEmailTypes, listTestPushTypes, sendAllTestEmails, sendTestEmail, sendTestPush } from '../../services/notifications/testPushService';
import type { TestEmailType } from '../../services/notifications/testPushService';
import type { NotificationAudience, NotificationType } from '../../services/notifications/templates';
import { sendSuccess, handleServiceError } from '../../utils/response';

function actorId(req: Request, audience: NotificationAudience): string {
  return (audience === 'seller' ? req.seller : req.customer)!.id;
}

export function getTestPushTypes(audience: NotificationAudience): RequestHandler {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      sendSuccess(res, { types: await listTestPushTypes(actorId(req, audience), audience) });
    } catch (err: unknown) {
      handleServiceError(err, res);
    }
  };
}

export function postTestPush(audience: NotificationAudience): RequestHandler {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { type, params } = req.body as { type: NotificationType; params?: Record<string, unknown> };
      const result = await sendTestPush(actorId(req, audience), audience, type, params ?? {});
      const delivered = result.devices.some((d) => d.outcome === 'sent');
      sendSuccess(res, result, delivered ? 'Test push sent' : 'Test push failed on every device');
    } catch (err: unknown) {
      handleServiceError(err, res);
    }
  };
}

export async function postTestEmail(req: Request, res: Response): Promise<void> {
  try {
    const { type, params } = req.body as { type: TestEmailType; params?: Record<string, unknown> };
    sendSuccess(res, await sendTestEmail(req.seller!.id, type, params ?? {}), 'Test email sent');
  } catch (err: unknown) {
    handleServiceError(err, res);
  }
}

export async function getTestEmailTypes(req: Request, res: Response): Promise<void> {
  try {
    sendSuccess(res, { types: await listTestEmailTypes(req.seller!.id) });
  } catch (err: unknown) {
    handleServiceError(err, res);
  }
}

export async function postAllTestEmails(req: Request, res: Response): Promise<void> {
  try {
    const result = await sendAllTestEmails(req.seller!.id);
    sendSuccess(res, result, `Sent ${result.sent} of ${result.emails.length} test emails`);
  } catch (err: unknown) {
    handleServiceError(err, res);
  }
}
