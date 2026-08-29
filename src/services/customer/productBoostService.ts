import { Op, col, where as sequelizeWhere } from 'sequelize';
import { ProductBoost } from '../../models/ProductBoost';
import { Product } from '../../models/Product';
import { TRENDING_ATTRIBUTES, SELLER_VERIFIED_CONDITION } from './productService';

export const BOOST_SLOTS = 4;

export interface EligibleBoost {
  boostId: string;
  product: Product;
}

interface EligibilityParams {
  categoryId?: number;
  state?: string;
  city?: string;
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

  const productWhere: Record<string, unknown> = {
    id: { [Op.in]: candidateProductIds },
    isActive: true,
    [Op.and]: [SELLER_VERIFIED_CONDITION],
  };
  if (params.categoryId !== undefined) productWhere.categoryId = params.categoryId;

  const products = await Product.findAll({ attributes: TRENDING_ATTRIBUTES, where: productWhere });
  const productById = new Map(products.map(p => [p.id, p]));

  const seenProductIds = new Set<string>();
  const eligible: EligibleBoost[] = [];
  for (const boost of boosts) {
    const product = productById.get(boost.productId);
    if (!product || seenProductIds.has(boost.productId)) continue;
    seenProductIds.add(boost.productId);
    eligible.push({ boostId: boost.id, product });
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
