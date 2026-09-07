import type { Request, Response } from 'express';
import { sendSuccess, handleServiceError } from '../../utils/response';
import { withSignedImages, getPresignedUrl, toThumbnailKey } from '../../utils/imageStorage';
import { getActiveOffersForProducts, computeOfferPricing } from '../../utils/offerPricing';
import * as productService from '../../services/customer/productService';
import * as wishlistService from '../../services/customer/wishlistService';
import * as productViewService from '../../services/customer/productViewService';
import * as productBoostService from '../../services/customer/productBoostService';
import * as variantSelection from '../../services/customer/variantSelection';
import type { Product } from '../../models/Product';
import type { ProductVariant } from '../../models/ProductVariant';
import type { Offer } from '../../models/Offer';
import type { EligibleBoost } from '../../services/customer/productBoostService';

interface ProductListItem {
  id: string;
  productId: string;
  title: string;
  image: string | null;
  mrp: number | null;
  sellingPrice: number;
  variantId: string | null;
  variantStock: number | null;
  variantAttributes: Record<string, unknown> | null;
  variantIsActive: boolean | null;
  offerId: number | null;
  offerPrice: number | null;
  offerBadge: string | null;
  rating: number;
  isWishlisted: boolean;
  isBoosted: boolean;
  distanceKm?: number;
}

function offerFieldsFor(offersById: Map<string, Offer>, productId: string, sellingPrice: number): { offerId: number | null; offerPrice: number | null; offerBadge: string | null } {
  const offer = offersById.get(productId);
  if (!offer) return { offerId: null, offerPrice: null, offerBadge: null };
  return { offerId: offer.id, ...computeOfferPricing(offer, sellingPrice) };
}

interface ListItemContext {
  offersById: Map<string, Offer>;
  wishlistedIds: Set<string>;
  variantsByProduct: Map<string, ProductVariant[]>;
  search?: string;
  isBoosted: boolean;
  distanceKm?: number;
}

async function toListItem(p: Product, ctx: ListItemContext): Promise<ProductListItem> {
  const chosen = variantSelection.pickVariantForSearch(ctx.variantsByProduct.get(p.id) ?? [], ctx.search);

  const displayKey = chosen?.images?.[0] ?? p.images[0] ?? null;
  const sellingPrice = Number(chosen?.sellingPrice ?? p.sellingPrice);
  const mrp = chosen?.mrp ?? p.mrp;

  const item: ProductListItem = {
    id: p.id,
    productId: p.id,
    title: p.name,
    image: displayKey ? await getPresignedUrl(toThumbnailKey(displayKey)) : null,
    mrp,
    sellingPrice,
    variantId: chosen?.id ?? null,
    variantStock: chosen ? chosen.stock : null,
    variantAttributes: chosen ? (chosen.attributes as Record<string, unknown>) : null,
    variantIsActive: chosen ? chosen.isActive : null,
    ...offerFieldsFor(ctx.offersById, p.id, sellingPrice),
    rating: 0,
    isWishlisted: ctx.wishlistedIds.has(p.id),
    isBoosted: ctx.isBoosted,
  };
  if (ctx.distanceKm !== undefined) item.distanceKm = ctx.distanceKm;
  return item;
}

export async function getProducts(req: Request, res: Response): Promise<void> {
  const { page, limit, searchQuery, searchByLocation, category_id: categoryId, brand_id: brandId, shop_id: shopId, offer_id: offerId, state, city } = req.body;

  const hasLocation = searchByLocation !== undefined;
  const search: string | undefined = searchQuery || undefined;

  let chosenBoosts: EligibleBoost[] = [];
  if (page === 1) {
    const eligible = await productBoostService.getEligibleBoosts({ categoryId, state, city });
    chosenBoosts = productBoostService.pickRandom(eligible, Math.min(productBoostService.BOOST_SLOTS, limit));
  }
  const boostedProductIds = chosenBoosts.map((b) => b.product.id);

  const { rows, count } = await productService.browseProducts(
    {
      categoryId,
      brandId,
      sellerId: shopId,
      offerId,
      search,
      lat: searchByLocation?.lat,
      lng: searchByLocation?.lng,
      excludeProductIds: boostedProductIds,
    },
    page,
    limit - chosenBoosts.length,
  );

  const productIds = [...boostedProductIds, ...rows.map((p) => p.id)];
  const [wishlistedIds, offersById, variantsByProduct] = await Promise.all([
    req.customer ? wishlistService.getWishlistedProductIds(req.customer.id, productIds) : Promise.resolve(new Set<string>()),
    getActiveOffersForProducts(productIds),
    variantSelection.getActiveVariantsByProduct(productIds),
  ]);

  const boostedItems = await Promise.all(
    chosenBoosts.map((b) => toListItem(b.product, { offersById, wishlistedIds, variantsByProduct, search, isBoosted: true })),
  );

  const organicItems = await Promise.all(
    rows.map((p) =>
      toListItem(p, {
        offersById,
        wishlistedIds,
        variantsByProduct,
        search,
        isBoosted: false,
        distanceKm: hasLocation ? Number(p.get('distanceKm') as string | number) : undefined,
      }),
    ),
  );

  if (chosenBoosts.length > 0) {
    await productBoostService.incrementImpressions(chosenBoosts.map((b) => b.boostId));
  }

  sendSuccess(res, { products: [...boostedItems, ...organicItems], total: count, page, limit }, 'Products fetched');
}

export async function getProduct(req: Request, res: Response): Promise<void> {
  try {
    const variantId = req.query.variantId ? String(req.query.variantId) : undefined;
    const { product, seller, variants, rating } = await productService.getProductDetail(String(req.params.id), variantId);
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
    sendSuccess(res, { product: { ...signedProduct, seller, isWishlisted, offerId, offerPrice, offerBadge, rating }, variants: signedVariants }, 'Product fetched');
  } catch (err: unknown) {
    handleServiceError(err, res, 'Product not found');
  }
}

export async function getTrendingProducts(req: Request, res: Response): Promise<void> {
  const state = req.query.state ? String(req.query.state) : undefined;
  const city = req.query.city ? String(req.query.city) : undefined;

  const eligible = await productBoostService.getEligibleBoosts({ state, city });
  const chosenBoosts = productBoostService.pickRandom(eligible, Math.min(productBoostService.BOOST_SLOTS, productService.TRENDING_LIMIT));
  const boostedProductIds = chosenBoosts.map((b) => b.product.id);

  const rows = await productService.getTrendingProducts(boostedProductIds, productService.TRENDING_LIMIT - chosenBoosts.length);
  const productIds = [...boostedProductIds, ...rows.map((p) => p.id)];

  const [wishlistedIds, offersById, variantsByProduct] = await Promise.all([
    req.customer ? wishlistService.getWishlistedProductIds(req.customer.id, productIds) : Promise.resolve(new Set<string>()),
    getActiveOffersForProducts(productIds),
    variantSelection.getActiveVariantsByProduct(productIds),
  ]);

  const boostedItems = await Promise.all(
    chosenBoosts.map((b) => toListItem(b.product, { offersById, wishlistedIds, variantsByProduct, isBoosted: true })),
  );

  const organicItems = await Promise.all(
    rows.map((p) => toListItem(p, { offersById, wishlistedIds, variantsByProduct, isBoosted: false })),
  );

  if (chosenBoosts.length > 0) {
    await productBoostService.incrementImpressions(chosenBoosts.map((b) => b.boostId));
  }

  sendSuccess(res, { products: [...boostedItems, ...organicItems] }, 'Trending products fetched');
}

export async function getSimilarProducts(req: Request, res: Response): Promise<void> {
  try {
    const rows = await productService.getSimilarProducts(String(req.params.id));
    const productIds = rows.map((p) => p.id);

    const [wishlistedIds, offersById, variantsByProduct] = await Promise.all([
      req.customer ? wishlistService.getWishlistedProductIds(req.customer.id, productIds) : Promise.resolve(new Set<string>()),
      getActiveOffersForProducts(productIds),
      variantSelection.getActiveVariantsByProduct(productIds),
    ]);

    const products = await Promise.all(
      rows.map((p) => toListItem(p, { offersById, wishlistedIds, variantsByProduct, isBoosted: false })),
    );

    sendSuccess(res, { products }, 'Similar products fetched');
  } catch (err: unknown) {
    handleServiceError(err, res, 'Product not found');
  }
}
