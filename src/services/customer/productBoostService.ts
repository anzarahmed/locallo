import { Op, col, where as sequelizeWhere } from 'sequelize';
import { ProductBoost } from '../../models/ProductBoost';
import { Product } from '../../models/Product';
import { ProductVariant } from '../../models/ProductVariant';
import { TRENDING_ATTRIBUTES, SELLER_VERIFIED_CONDITION, buildSearchCondition, getSequelizeEscape } from './productService';

export const BOOST_SLOTS = 4;

const BOOST_VARIANT_ATTRIBUTES = ['id', 'productId', 'attributes', 'images', 'stock', 'sellingPrice', 'mrp', 'isActive'];

export interface EligibleBoost {
  boostId: string;
  product: Product;
  variant: ProductVariant | null;
}

interface EligibilityParams {
  categoryId?: number;
  state?: string;
  city?: string;
  search?: string;
  excludeProductIds?: string[];
}

export async function getEligibleBoosts(params: EligibilityParams): Promise<EligibleBoost[]> {
  const audienceOr: Record<string, unknown>[] = [{ audienceType: 'pan_india' }];
  if (params.state) audienceOr.push({ audienceType: 'state', state: { [Op.iLike]: params.state } });
  if (params.city) audienceOr.push({ audienceType: 'city', city: { [Op.iLike]: params.city } });

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
  const candidateProductIds = [...new Set(boosts.map(b => b.productId))].filter(id => !excludeSet.has(id));
  if (candidateProductIds.length === 0) return [];

  const andClauses: unknown[] = [SELLER_VERIFIED_CONDITION];
  const productWhere: Record<string, unknown> = {
    id: { [Op.in]: candidateProductIds },
    isActive: true,
    [Op.and]: andClauses,
  };
  if (params.categoryId !== undefined) productWhere.categoryId = params.categoryId;

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
