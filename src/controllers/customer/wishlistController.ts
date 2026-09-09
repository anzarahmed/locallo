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
  variantStock: number | null;
  variantAttributes: Record<string, unknown> | null;
  variantIsActive: boolean | null;
  lat: number | null;
  long: number | null;
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

  const sellerIds = [...new Set(rows.map((w) => w.product.sellerId))];
  const locations = await wishlistService.getSellerLocations(sellerIds);

  const products: WishlistItem[] = await Promise.all(
    rows.map(async (w) => {
      const v = w.variant;
      const image = v?.images[0] ?? w.product.images[0];
      const location = locations.get(w.product.sellerId);
      return {
        id: w.product.id,
        productId: w.product.id,
        variantId: w.variantId,
        title: w.product.name,
        image: image ? await getPresignedUrl(toThumbnailKey(image)) : null,
        mrp: v?.mrp ?? w.product.mrp,
        sellingPrice: v?.sellingPrice ?? w.product.sellingPrice,
        variantStock: v ? v.stock : null,
        variantAttributes: v ? v.attributes : null,
        variantIsActive: v ? v.isActive : null,
        lat: location?.lat ?? null,
        long: location?.long ?? null,
        rating: 0,
        isWishlisted: true,
      };
    }),
  );

  sendSuccess(res, { products, total: count, page, limit }, 'Wishlist fetched');
}
