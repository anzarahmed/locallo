import type { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response';
import { verifyRecaptchaToken } from '../utils/recaptcha';

export function verifyRecaptcha(expectedAction: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { captchaToken } = req.body as { captchaToken?: string };
    const secret = process.env.RECAPTCHA_SECRET_KEY;
    const isProd = process.env.NODE_ENV === 'production';

    if (!secret) {
      if (isProd) {
        console.error('[recaptcha] RECAPTCHA_SECRET_KEY is not set in production');
        sendError(res, 'Server misconfiguration', 500);
        return;
      }
      console.warn('[recaptcha] RECAPTCHA_SECRET_KEY not set — skipping verification (dev mode)');
      next();
      return;
    }

    if (!captchaToken) {
      if (!isProd) {
        console.warn('[recaptcha] captchaToken missing — skipping verification (dev mode)');
        next();
        return;
      }
      sendError(res, 'Captcha verification required', 400);
      return;
    }

    try {
      const result = await verifyRecaptchaToken(captchaToken);
      const minScore = Number(process.env.RECAPTCHA_MIN_SCORE ?? 0.5);

      if (!result.success || result.action !== expectedAction || (result.score ?? 0) < minScore) {
        console.warn('[recaptcha] verification failed', { expectedAction, result });
        sendError(res, 'Captcha verification failed. Please try again.', 403);
        return;
      }
      next();
    } catch (err) {
      console.error('[recaptcha] verification error', err);
      sendError(res, 'Captcha verification failed. Please try again.', 503);
    }
  };
}
