import type { Response } from 'express';

export function sendSuccess<T>(res: Response, data: T, status = 200): void {
  res.status(status).json({ success: true, data });
}

export function sendError(
  res: Response,
  message: string,
  status = 500,
  errors?: string[],
): void {
  const body: { success: false; message: string; errors?: string[] } = { success: false, message };
  if (errors) body.errors = errors;
  res.status(status).json(body);
}
