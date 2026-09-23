import type { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response';
import { verifyRecaptchaToken, verifyRecaptchaV2Token } from '../utils/recaptcha';

// Sent back whenever v3 (or v2 itself) fails so the client knows to show the v2 checkbox challenge.
const CAPTCHA_V2_REQUIRED = 'captcha_v2_required';

export function verifyRecaptcha(expectedAction: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { captchaToken, captchaVersion } = req.body as { captchaToken?: string; captchaVersion?: 'v2' | 'v3' };
    const isProd = process.env.NODE_ENV === 'production';
    const isV2 = captchaVersion === 'v2';
    const secretEnvVar = isV2 ? 'RECAPTCHA_V2_SECRET_KEY' : 'RECAPTCHA_SECRET_KEY';
    const secret = process.env[secretEnvVar];

    if (!secret) {
      if (isProd) {
        console.error(`[recaptcha] ${secretEnvVar} is not set in production`);
        sendError(res, 'Server misconfiguration', 500);
        return;
      }
      console.warn(`[recaptcha] ${secretEnvVar} not set — skipping verification (dev mode)`);
      next();
      return;
    }

    if (!captchaToken) {
      if (!isProd) {
        console.warn('[recaptcha] captchaToken missing — skipping verification (dev mode)');
        next();
        return;
      }
      sendError(res, 'Captcha verification required', 400, isV2 ? undefined : [CAPTCHA_V2_REQUIRED]);
      return;
    }

    try {
      if (isV2) {
        const result = await verifyRecaptchaV2Token(captchaToken);
        if (!result.success) {
          console.warn('[recaptcha] v2 verification failed', result);
          sendError(res, 'Captcha verification failed. Please try again.', 403, [CAPTCHA_V2_REQUIRED]);
          return;
        }
        next();
        return;
      }

      const result = await verifyRecaptchaToken(captchaToken);
      const minScore = Number(process.env.RECAPTCHA_MIN_SCORE ?? 0.5);

      if (!result.success || result.action !== expectedAction || (result.score ?? 0) < minScore) {
        console.warn('[recaptcha] v3 verification failed — falling back to v2', { expectedAction, result });
        sendError(res, 'We could not verify you automatically. Please complete the challenge below.', 403, [CAPTCHA_V2_REQUIRED]);
        return;
      }
      next();
    } catch (err) {
      console.error('[recaptcha] verification error — falling back to v2', err);
      sendError(res, 'We could not verify you automatically. Please complete the challenge below.', 503, [CAPTCHA_V2_REQUIRED]);
    }
  };
}
