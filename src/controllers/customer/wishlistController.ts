import type { Request, Response } from 'express';
import { sendSuccess, handleServiceError } from '../../utils/response';
import { getPresignedUrl, toThumbnailKey } from '../../utils/imageStorage';
import { parsePagination } from '../../utils/pagination';
import * as wishlistService from '../../services/customer/wishlistService';

interface WishlistItem {
  id: string;
  title: string;
  image: string | null;
  mrp: number | null;
  sellingPrice: number;
  rating: number;
  isWishlisted: true;
}

export async function toggleWishlist(req: Request, res: Response): Promise<void> {
  try {
    const wishlisted = await wishlistService.toggleWishlist(req.customer!.id, String(req.params.productId));
    sendSuccess(res, { wishlisted }, wishlisted ? 'Added to wishlist' : 'Removed from wishlist');
  } catch (err: unknown) {
    handleServiceError(err, res, 'Product not found');
  }
}

export async function getWishlist(req: Request, res: Response): Promise<void> {
  const { page, limit } = parsePagination(req);
  const { rows, count } = await wishlistService.listWishlist(req.customer!.id, page, limit);

  const products: WishlistItem[] = await Promise.all(
    rows.map(async (p) => ({
      id: p.id,
      title: p.name,
      image: p.images[0] ? await getPresignedUrl(toThumbnailKey(p.images[0])) : null,
      mrp: p.mrp,
      sellingPrice: p.sellingPrice,
      rating: 0,
      isWishlisted: true,
    })),
  );

  sendSuccess(res, { products, total: count, page, limit }, 'Wishlist fetched');
}
