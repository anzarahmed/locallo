import type { Request } from 'express';

export function parsePagination(
  req: Request,
  maxLimit = 50,
  defaultLimit = 20,
): { page: number; limit: number } {
  const page  = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(maxLimit, Math.max(1, Number(req.query.limit) || defaultLimit));
  return { page, limit };
}
