import rateLimit from 'express-rate-limit';
import type { RequestHandler } from 'express';

const WINDOW_MS = 10 * 60_000;

function otpLimiter(limit: number): RequestHandler {
  return rateLimit({
    windowMs: WINDOW_MS,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, res, _next, options) => {
      res.status(options.statusCode).json({
        success: false,
        message: 'Too many requests from this device. Please try again later.',
        data: { retryAfterSeconds: Math.ceil(options.windowMs / 1000) },
      });
    },
  });
}

export const otpRequestLimiter = otpLimiter(20);
export const otpVerifyLimiter = otpLimiter(30);
