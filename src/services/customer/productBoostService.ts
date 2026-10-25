import { Op, col, where as sequelizeWhere } from 'sequelize';
import { ProductBoost } from '../../models/ProductBoost';
import { Product } from '../../models/Product';
import { ProductVariant } from '../../models/ProductVariant';
import { SellerProfile } from '../../models/SellerProfile';
import { OfferProduct } from '../../models/OfferProduct';
import { notifySafely } from '../notifications/notifyService';
import { TRENDING_ATTRIBUTES, SELLER_VERIFIED_CONDITION, buildSearchCondition, getSequelizeEscape, inStockCondition } from './productService';

export const BOOST_SLOTS = 4;
export const SIMILAR_BOOST_SLOTS = 2;

const BOOST_VARIANT_ATTRIBUTES = ['id', 'productId', 'attributes', 'images', 'stock', 'sellingPrice', 'mrp', 'isActive'];

export interface EligibleBoost {
  boostId: string;
  product: Product;
  // In-stock promoted options of a group boost; null for a whole-product boost.
  variants: ProductVariant[] | null;
}

interface EligibilityParams {
  categoryId?: number;
  categoryIds?: number[];
  brandId?: number;
  sellerId?: string;
  offerId?: number;
  state?: string;
  city?: string;
  search?: string;
  excludeProductIds?: string[];
}

function buildAudienceOrFilter(state?: string, city?: string): Record<string, unknown>[] {
  const audienceOr: Record<string, unknown>[] = [{ audienceType: 'pan_india' }];
  if (state) audienceOr.push({ audienceType: 'state', state: { [Op.iLike]: state } });
  if (city) audienceOr.push({ audienceType: 'city', city: { [Op.iLike]: city } });
  return audienceOr;
}

export async function getEligibleBoosts(params: EligibilityParams): Promise<EligibleBoost[]> {
  const audienceOr = buildAudienceOrFilter(params.state, params.city);

  const liveBoosts = await ProductBoost.findAll({
    where: {
      status: 'active',
      paymentStatus: 'paid',
      productId: { [Op.ne]: null },
      [Op.or]: audienceOr,
      [Op.and]: [sequelizeWhere(col('impression_count'), Op.lt, col('estimated_impressions_max'))],
    },
  });
  const boosts = liveBoosts.filter((b): b is ProductBoost & { productId: string } => b.productId !== null);

  if (boosts.length === 0) return [];

  const excludeSet = new Set(params.excludeProductIds ?? []);
  let candidateProductIds = [...new Set(boosts.map(b => b.productId))].filter(id => !excludeSet.has(id));
  if (candidateProductIds.length === 0) return [];

  if (params.offerId !== undefined) {
    const offerProducts = await OfferProduct.findAll({
      where: { offerId: params.offerId },
      attributes: ['productId'],
    });
    const offerProductIds = new Set(offerProducts.map(op => op.productId));
    candidateProductIds = candidateProductIds.filter(id => offerProductIds.has(id));
    if (candidateProductIds.length === 0) return [];
  }

  const andClauses: unknown[] = [SELLER_VERIFIED_CONDITION, inStockCondition()];
  const productWhere: Record<string, unknown> = {
    id: { [Op.in]: candidateProductIds },
    isActive: true,
    [Op.and]: andClauses,
  };
  if (params.categoryId !== undefined) productWhere.categoryId = params.categoryId;
  if (params.sellerId !== undefined) productWhere.sellerId = params.sellerId;

  // The singular categoryId branch above is now only reached by getSimilarProducts'
  // exact-leaf-category boost lookup; customer product search always resolves category_id
  // (a MasterCategory id) into categoryIds before calling.
  if (params.categoryIds !== undefined) {
    if (params.categoryIds.length === 0) return [];
    productWhere.categoryId = { [Op.in]: params.categoryIds };
  }

  if (params.brandId !== undefined) {
    const sellerProfiles = await SellerProfile.findAll({
      where: { brandIds: { [Op.contains]: [params.brandId] } },
      attributes: ['userId'],
    });
    const sellerIds = sellerProfiles.map(p => p.userId);
    if (sellerIds.length === 0) return [];
    productWhere.sellerId = { [Op.in]: sellerIds };
  }

  if (params.search) {
    const built = buildSearchCondition(params.search, getSequelizeEscape());
    if (built) andClauses.push(built.condition);
  }

  const products = await Product.findAll({ attributes: TRENDING_ATTRIBUTES, where: productWhere });
  const productById = new Map(products.map(p => [p.id, p]));

  const promotedIds = [...new Set(boosts.flatMap(b => b.variantIds ?? []))];
  const inStockVariantById = new Map<string, ProductVariant>();
  if (promotedIds.length > 0) {
    const variants = await ProductVariant.findAll({
      where: { id: { [Op.in]: promotedIds }, isActive: true, stock: { [Op.gt]: 0 } },
      attributes: BOOST_VARIANT_ATTRIBUTES,
      order: [['createdAt', 'ASC'], ['id', 'ASC']],
    });
    for (const v of variants) inStockVariantById.set(v.id, v);
  }

  const seenProductIds = new Set<string>();
  const eligible: EligibleBoost[] = [];
  for (const boost of boosts) {
    const product = productById.get(boost.productId);
    if (!product || seenProductIds.has(boost.productId)) continue;

    let variants: ProductVariant[] | null = null;
    if (boost.variantIds) {
      variants = boost.variantIds
        .map(id => inStockVariantById.get(id))
        .filter((v): v is ProductVariant => v !== undefined && v.productId === boost.productId);
      if (variants.length === 0) continue;
    }

    seenProductIds.add(boost.productId);
    eligible.push({ boostId: boost.id, product, variants });
  }
  return eligible;
}

export function pickRandom(eligible: EligibleBoost[], count: number = BOOST_SLOTS): EligibleBoost[] {
  const pool = [...eligible];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

export async function incrementImpressions(boostIds: string[]): Promise<void> {
  if (boostIds.length === 0) return;

  await ProductBoost.increment('impressionCount', { by: 1, where: { id: { [Op.in]: boostIds } } });

  const [, completed] = await ProductBoost.update(
    { status: 'completed' },
    {
      where: {
        id: { [Op.in]: boostIds },
        status: 'active',
        [Op.and]: [sequelizeWhere(col('impression_count'), Op.gte, col('estimated_impressions_max'))],
      },
      returning: true,
    },
  );

  await Promise.all(completed.map((boost) => notifySafely(
    boost.sellerId,
    'boost_completed',
    {
      boostId: boost.id,
      productId: boost.productId,
      productName: boost.productName ?? 'Your product',
      target: boost.estimatedImpressionsMax,
    },
    { dedupeKey: `boost_completed:${boost.id}` },
  )));
}

export async function isProductBoosted(productId: string, variantId?: string, state?: string, city?: string): Promise<boolean> {
  const where: Record<string | symbol, unknown> = {
    productId,
    status: 'active',
    paymentStatus: 'paid',
    [Op.or]: buildAudienceOrFilter(state, city),
  };
  // A boost with no variant_ids covers every variant of the product.
  if (variantId) {
    where[Op.and] = [{ [Op.or]: [{ variantIds: null }, { variantIds: { [Op.contains]: [variantId] } }] }];
    return (await ProductBoost.count({ where })) > 0;
  }

  // No variant requested: same rule as getEligibleBoosts — a group boost counts only while
  // one of its options is visible and in stock, so detail and listings agree.
  const boosts = await ProductBoost.findAll({ where, attributes: ['id', 'variantIds'] });
  if (boosts.some(b => b.variantIds === null)) return true;
  const listedIds = [...new Set(boosts.flatMap(b => b.variantIds ?? []))];
  if (listedIds.length === 0) return false;
  const inStockListed = await ProductVariant.count({
    where: { id: { [Op.in]: listedIds }, productId, isActive: true, stock: { [Op.gt]: 0 } },
  });
  return inStockListed > 0;
}
