import { Op, col, where as sequelizeWhere } from 'sequelize';
import { ProductBoost } from '../../models/ProductBoost';
import { Product } from '../../models/Product';
import { ProductVariant } from '../../models/ProductVariant';
import { SellerProfile } from '../../models/SellerProfile';
import { OfferProduct } from '../../models/OfferProduct';
import { TRENDING_ATTRIBUTES, SELLER_VERIFIED_CONDITION, buildSearchCondition, getSequelizeEscape } from './productService';

export const BOOST_SLOTS = 4;
export const SIMILAR_BOOST_SLOTS = 2;

const BOOST_VARIANT_ATTRIBUTES = ['id', 'productId', 'attributes', 'images', 'stock', 'sellingPrice', 'mrp', 'isActive'];

export interface EligibleBoost {
  boostId: string;
  product: Product;
  variant: ProductVariant | null;
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

  const boosts = await ProductBoost.findAll({
    where: {
      status: 'active',
      paymentStatus: 'paid',
      [Op.or]: audienceOr,
      [Op.and]: [sequelizeWhere(col('impression_count'), Op.lt, col('estimated_impressions_max'))],
    },
  });

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

  const andClauses: unknown[] = [SELLER_VERIFIED_CONDITION];
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

  const variantIds = [...new Set(boosts.map(b => b.variantId).filter((v): v is string => !!v))];
  const variantById = new Map<string, ProductVariant>();
  if (variantIds.length > 0) {
    const variants = await ProductVariant.findAll({
      where: { id: { [Op.in]: variantIds }, isActive: true },
      attributes: BOOST_VARIANT_ATTRIBUTES,
    });
    for (const v of variants) variantById.set(v.id, v);
  }

  const seenProductIds = new Set<string>();
  const eligible: EligibleBoost[] = [];
  for (const boost of boosts) {
    if (boost.variantId && !variantById.has(boost.variantId)) continue;
    const product = productById.get(boost.productId);
    if (!product || seenProductIds.has(boost.productId)) continue;
    seenProductIds.add(boost.productId);
    eligible.push({
      boostId: boost.id,
      product,
      variant: boost.variantId ? (variantById.get(boost.variantId) ?? null) : null,
    });
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

  await ProductBoost.update(
    { status: 'completed' },
    {
      where: {
        id: { [Op.in]: boostIds },
        status: 'active',
        [Op.and]: [sequelizeWhere(col('impression_count'), Op.gte, col('estimated_impressions_max'))],
      },
    },
  );
}

export async function isProductBoosted(productId: string, variantId?: string, state?: string, city?: string): Promise<boolean> {
  const where: Record<string, unknown> = {
    productId,
    status: 'active',
    paymentStatus: 'paid',
    [Op.or]: buildAudienceOrFilter(state, city),
  };
  // A boost with no variantId covers every variant of the product.
  if (variantId) {
    where.variantId = { [Op.or]: [variantId, null] };
    return (await ProductBoost.count({ where })) > 0;
  }

  // No variant requested: a boost pinned to a now-inactive variant must not count.
  const boosts = await ProductBoost.findAll({
    where,
    include: [{ model: ProductVariant, as: 'variant', attributes: ['isActive'], required: false }],
  });
  return boosts.some((b) => b.variantId === null || b.variant?.isActive === true);
}
