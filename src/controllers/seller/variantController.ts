import type { Request, Response } from 'express';
import { sendSuccess, sendError } from '../../utils/response';
import * as variantService from '../../services/seller/variantService';

export async function getVariants(req: Request, res: Response): Promise<void> {
  try {
    const { product, variants } = await variantService.getProductVariants(
      String(req.params.productId),
      req.seller!.id,
    );
    sendSuccess(res, { product, variants }, 'Variants fetched');
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    sendError(res, e.message ?? 'Failed to fetch variants', e.status ?? 500);
  }
}

export async function createVariant(req: Request, res: Response): Promise<void> {
  try {
    const variant = await variantService.createVariant(
      String(req.params.productId),
      req.seller!.id,
      req.body,
    );
    sendSuccess(res, { variant }, 'Variant created', 201);
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    sendError(res, e.message ?? 'Failed to create variant', e.status ?? 500);
  }
}

export async function updateVariant(req: Request, res: Response): Promise<void> {
  try {
    const variant = await variantService.updateVariant(
      String(req.params.productId),
      String(req.params.variantId),
      req.seller!.id,
      req.body,
    );
    sendSuccess(res, { variant }, 'Variant updated');
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    sendError(res, e.message ?? 'Failed to update variant', e.status ?? 500);
  }
}

export async function deleteVariant(req: Request, res: Response): Promise<void> {
  try {
    await variantService.deleteVariant(
      String(req.params.productId),
      String(req.params.variantId),
      req.seller!.id,
    );
    sendSuccess(res, null, 'Variant deleted');
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    sendError(res, e.message ?? 'Failed to delete variant', e.status ?? 500);
  }
}

export async function toggleVariant(req: Request, res: Response): Promise<void> {
  try {
    const variant = await variantService.toggleVariant(
      String(req.params.productId),
      String(req.params.variantId),
      req.seller!.id,
    );
    sendSuccess(res, { variant }, 'Variant status updated');
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    sendError(res, e.message ?? 'Failed to toggle variant', e.status ?? 500);
  }
}
