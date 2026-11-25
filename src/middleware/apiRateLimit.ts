import rateLimit from 'express-rate-limit';
import type { RequestHandler } from 'express';

const WINDOW_MS = Number(process.env.API_RATE_LIMIT_WINDOW_MS ?? 60_000);
const LIMIT = Number(process.env.API_RATE_LIMIT_MAX ?? 100);

// Group IPv6 clients by /64 so rotating addresses inside one subnet doesn't mint new buckets.
function clientKey(ip: string | undefined): string {
  if (!ip) return 'unknown';
  if (ip.includes(':')) return ip.split(':').slice(0, 4).join(':');
  return ip;
}

export const apiLimiter: RequestHandler = rateLimit({
  windowMs: WINDOW_MS,
  limit: LIMIT,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => clientKey(req.ip),
  // Webhooks are signature-verified and must not be throttled; CORS preflights shouldn't count.
  skip: (req) => req.method === 'OPTIONS' || req.path.startsWith('/webhooks'),
  handler: (_req, res, _next, options) => {
    res.status(options.statusCode).json({
      success: false,
      message: 'Too many requests. Please try again later.',
      data: { retryAfterSeconds: Math.ceil(options.windowMs / 1000) },
    });
  },
});
