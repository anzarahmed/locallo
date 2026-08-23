import type { Request, Response } from 'express';
import { sendSuccess, handleServiceError } from '../../utils/response';
import { withSignedImages, getPresignedUrl, toThumbnailKey } from '../../utils/imageStorage';
import { getActiveOffersForProducts, computeOfferPricing } from '../../utils/offerPricing';
import * as productService from '../../services/customer/productService';
import * as wishlistService from '../../services/customer/wishlistService';
import * as productViewService from '../../services/customer/productViewService';
import type { Offer } from '../../models/Offer';

interface ProductListItem {
  id: string;
  title: string;
  image: string | null;
  mrp: number | null;
  sellingPrice: number;
  offerId: number | null;
  offerPrice: number | null;
  offerBadge: string | null;
  rating: number;
  isWishlisted: boolean;
  distanceKm?: number;
}

function offerFieldsFor(offersById: Map<string, Offer>, productId: string, sellingPrice: number): { offerId: number | null; offerPrice: number | null; offerBadge: string | null } {
  const offer = offersById.get(productId);
  if (!offer) return { offerId: null, offerPrice: null, offerBadge: null };
  return { offerId: offer.id, ...computeOfferPricing(offer, sellingPrice) };
}

export async function getProducts(req: Request, res: Response): Promise<void> {
  const { page, limit, searchQuery, searchByLocation, category_id: categoryId, brand_id: brandId, shop_id: shopId, offer_id: offerId } = req.body;

  const hasLocation = searchByLocation !== undefined;
  const { rows, count } = await productService.browseProducts(
    {
      categoryId,
      brandId,
      sellerId: shopId,
      offerId,
      search: searchQuery || undefined,
      lat: searchByLocation?.lat,
      lng: searchByLocation?.lng,
    },
    page,
    limit,
  );

  const productIds = rows.map((p) => p.id);
  const [wishlistedIds, offersById] = await Promise.all([
    req.customer ? wishlistService.getWishlistedProductIds(req.customer.id, productIds) : Promise.resolve(new Set<string>()),
    getActiveOffersForProducts(productIds),
  ]);

  const products: ProductListItem[] = await Promise.all(
    rows.map(async (p) => {
      const item: ProductListItem = {
        id: p.id,
        title: p.name,
        image: p.images[0] ? await getPresignedUrl(toThumbnailKey(p.images[0])) : null,
        mrp: p.mrp,
        sellingPrice: p.sellingPrice,
        ...offerFieldsFor(offersById, p.id, p.sellingPrice),
        rating: 0,
        isWishlisted: wishlistedIds.has(p.id),
      };
      if (hasLocation) item.distanceKm = Number((p.get('distanceKm') as string | number));
      return item;
    }),
  );

  sendSuccess(res, { products, total: count, page, limit }, 'Products fetched');
}

export async function getProduct(req: Request, res: Response): Promise<void> {
  try {
    const variantId = req.query.variantId ? String(req.query.variantId) : undefined;
    const { product, seller, variants } = await productService.getProductDetail(String(req.params.id), variantId);
    if (req.customer) {
      void productViewService.recordProductView(req.customer.id, product.id, product.sellerId);
    }
    const [{ productWishlisted, wishlistedVariantIds }, offersById] = await Promise.all([
      req.customer
        ? wishlistService.getProductWishlistState(req.customer.id, product.id)
        : Promise.resolve({ productWishlisted: false, wishlistedVariantIds: new Set<string>() }),
      getActiveOffersForProducts([product.id]),
    ]);
    const isWishlisted = productWishlisted || (variantId ? wishlistedVariantIds.has(variantId) : false);
    const { offerId, offerPrice, offerBadge } = offerFieldsFor(offersById, product.id, product.sellingPrice);
    const [signedProduct, signedVariants] = await Promise.all([
      withSignedImages(product.toJSON() as Record<string, unknown>),
      Promise.all(variants.map(async (v) => {
        const signed = await withSignedImages(v as unknown as Record<string, unknown>);
        const variantSellingPrice = (v.sellingPrice ?? product.sellingPrice) as number;
        const variantWishlisted = productWishlisted || (v.id !== null && wishlistedVariantIds.has(v.id));
        return { ...signed, ...offerFieldsFor(offersById, product.id, variantSellingPrice), isWishlisted: variantWishlisted };
      })),
    ]);
    sendSuccess(res, { product: { ...signedProduct, seller, isWishlisted, offerId, offerPrice, offerBadge }, variants: signedVariants }, 'Product fetched');
  } catch (err: unknown) {
    handleServiceError(err, res, 'Product not found');
  }
}

export async function getTrendingProducts(req: Request, res: Response): Promise<void> {
  const rows = await productService.getTrendingProducts();
  const productIds = rows.map((p) => p.id);

  const [wishlistedIds, offersById] = await Promise.all([
    req.customer ? wishlistService.getWishlistedProductIds(req.customer.id, productIds) : Promise.resolve(new Set<string>()),
    getActiveOffersForProducts(productIds),
  ]);

  const products: ProductListItem[] = await Promise.all(
    rows.map(async (p) => ({
      id: p.id,
      title: p.name,
      image: p.images[0] ? await getPresignedUrl(toThumbnailKey(p.images[0])) : null,
      mrp: p.mrp,
      sellingPrice: p.sellingPrice,
      ...offerFieldsFor(offersById, p.id, p.sellingPrice),
      rating: 0,
      isWishlisted: wishlistedIds.has(p.id),
    })),
  );

  sendSuccess(res, { products }, 'Trending products fetched');
}

export async function getSimilarProducts(req: Request, res: Response): Promise<void> {
  try {
    const rows = await productService.getSimilarProducts(String(req.params.id));
    const productIds = rows.map((p) => p.id);

    const [wishlistedIds, offersById] = await Promise.all([
      req.customer ? wishlistService.getWishlistedProductIds(req.customer.id, productIds) : Promise.resolve(new Set<string>()),
      getActiveOffersForProducts(productIds),
    ]);

    const products: ProductListItem[] = await Promise.all(
      rows.map(async (p) => ({
        id: p.id,
        title: p.name,
        image: p.images[0] ? await getPresignedUrl(toThumbnailKey(p.images[0])) : null,
        mrp: p.mrp,
        sellingPrice: p.sellingPrice,
        ...offerFieldsFor(offersById, p.id, p.sellingPrice),
        rating: 0,
        isWishlisted: wishlistedIds.has(p.id),
      })),
    );

    sendSuccess(res, { products }, 'Similar products fetched');
  } catch (err: unknown) {
    handleServiceError(err, res, 'Product not found');
  }
}
