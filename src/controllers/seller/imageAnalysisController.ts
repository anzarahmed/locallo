import type { Request, Response } from 'express';
import { sendSuccess, sendError } from '../../utils/response';
import { analyzeAndSaveImage } from '../../services/seller/imageAnalysisService';

export async function analyzeImage(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    sendError(res, 'No image file provided', 400);
    return;
  }

  try {
    const result = await analyzeAndSaveImage(req.file, req.seller!.id);
    sendSuccess(res, result, 'Image uploaded and analyzed', 201);
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    sendError(res, e.message ?? 'Failed to analyze image', e.status ?? 500);
  }
}
