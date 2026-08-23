import type { Request, Response } from 'express';
import { sendSuccess, sendError, handleServiceError } from '../../utils/response';
import { getPresignedUrl, toThumbnailKey } from '../../utils/imageStorage';
import { parsePagination } from '../../utils/pagination';
import * as wishlistService from '../../services/customer/wishlistService';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface WishlistItem {
  id: string;
  productId: string;
  variantId: string | null;
  title: string;
  image: string | null;
  mrp: number | null;
  sellingPrice: number;
  rating: number;
  isWishlisted: true;
}

export async function toggleWishlist(req: Request, res: Response): Promise<void> {
  const variantId = req.params.variantId ? String(req.params.variantId) : undefined;
  if (variantId && !UUID_RE.test(variantId)) {
    sendError(res, 'variantId must be a valid UUID', 400);
    return;
  }

  try {
    const wishlisted = await wishlistService.toggleWishlist(req.customer!.id, String(req.params.productId), variantId);
    sendSuccess(res, { wishlisted }, wishlisted ? 'Added to wishlist' : 'Removed from wishlist');
  } catch (err: unknown) {
    handleServiceError(err, res, 'Product not found');
  }
}

export async function getWishlist(req: Request, res: Response): Promise<void> {
  const { page, limit } = parsePagination(req);
  const { rows, count } = await wishlistService.listWishlist(req.customer!.id, page, limit);

  const products: WishlistItem[] = await Promise.all(
    rows.map(async (w) => {
      const image = w.variant?.images[0] ?? w.product.images[0];
      return {
        id: w.product.id,
        productId: w.product.id,
        variantId: w.variantId,
        title: w.product.name,
        image: image ? await getPresignedUrl(toThumbnailKey(image)) : null,
        mrp: w.variant?.mrp ?? w.product.mrp,
        sellingPrice: w.variant?.sellingPrice ?? w.product.sellingPrice,
        rating: 0,
        isWishlisted: true,
      };
    }),
  );

  sendSuccess(res, { products, total: count, page, limit }, 'Wishlist fetched');
}
