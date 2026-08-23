import type { Request, Response } from 'express';
import { sendSuccess, sendError } from '../../utils/response';
import { verifyRazorpaySignature } from '../../utils/razorpay';
import * as boostService from '../../services/seller/boostService';

interface RazorpayWebhookBody {
  event: string;
  payload?: { payment?: { entity?: { id: string; order_id: string } } };
}

export async function handleRazorpayWebhook(req: Request, res: Response): Promise<void> {
  const signature = req.headers['x-razorpay-signature'] as string | undefined;
  if (!signature || !req.rawBody || !verifyRazorpaySignature(req.rawBody, signature)) {
    sendError(res, 'Invalid signature', 400);
    return;
  }

  const { event, payload } = req.body as RazorpayWebhookBody;
  const entity = payload?.payment?.entity;

  try {
    if (event === 'payment.captured' && entity) {
      await boostService.markBoostPaid(entity.order_id, entity.id, signature);
    } else if (event === 'payment.failed' && entity) {
      await boostService.markBoostFailed(entity.order_id, entity.id);
    }
    sendSuccess(res, {}, 'Webhook processed');
  } catch (err: unknown) {
    console.error('razorpayWebhookController: failed to process webhook', err);
    sendError(res, 'Webhook processing failed', 500);
  }
}
