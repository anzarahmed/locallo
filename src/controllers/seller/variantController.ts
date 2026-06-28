import type { Request, Response } from 'express';
import { sendSuccess, handleServiceError } from '../../utils/response';
import { withSignedImages } from '../../utils/imageStorage';
import * as variantService from '../../services/seller/variantService';

async function signVariant(variant: object): Promise<Record<string, unknown>> {
  return withSignedImages(variant as Record<string, unknown>);
}

export async function getVariants(req: Request, res: Response): Promise<void> {
  try {
    const { product, variants } = await variantService.getProductVariants(
      String(req.params.productId),
      req.seller!.id,
    );
    const productJson = product.toJSON() as Record<string, unknown>;
    const [signedProduct, signedVariants] = await Promise.all([
      withSignedImages(productJson),
      Promise.all(variants.map(v => signVariant(v.toJSON()))),
    ]);
    sendSuccess(res, { product: signedProduct, variants: signedVariants }, 'Variants fetched');
  } catch (err: unknown) {
    handleServiceError(err, res, 'Failed to fetch variants');
  }
}

export async function createVariant(req: Request, res: Response): Promise<void> {
  try {
    const variant = await variantService.createVariant(
      String(req.params.productId),
      req.seller!.id,
      req.body,
    );
    const signed = await signVariant(variant.toJSON());
    sendSuccess(res, { variant: signed }, 'Variant created', 201);
  } catch (err: unknown) {
    handleServiceError(err, res, 'Failed to create variant');
  }
}

export async function createBatchVariants(req: Request, res: Response): Promise<void> {
  try {
    const variants = await variantService.createBatchVariants(
      String(req.params.productId),
      req.seller!.id,
      req.body,
    );
    const signed = await Promise.all(variants.map(v => signVariant(v.toJSON())));
    sendSuccess(res, { variants: signed }, 'Variants created', 201);
  } catch (err: unknown) {
    handleServiceError(err, res, 'Failed to create variants');
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
    const signed = await signVariant(variant.toJSON());
    sendSuccess(res, { variant: signed }, 'Variant updated');
  } catch (err: unknown) {
    handleServiceError(err, res, 'Failed to update variant');
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
    handleServiceError(err, res, 'Failed to delete variant');
  }
}

export async function toggleVariant(req: Request, res: Response): Promise<void> {
  try {
    const variant = await variantService.toggleVariant(
      String(req.params.productId),
      String(req.params.variantId),
      req.seller!.id,
    );
    const signed = await signVariant(variant.toJSON());
    sendSuccess(res, { variant: signed }, 'Variant status updated');
  } catch (err: unknown) {
    handleServiceError(err, res, 'Failed to toggle variant');
  }
}
