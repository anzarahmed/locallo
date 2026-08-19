import { Product } from '../../models/Product';
import { ProductBoost } from '../../models/ProductBoost';
import type { BoostAudienceType } from '../../types';

const IMPRESSIONS_PER_RUPEE = 20;

export function estimateImpressions(dailyBudget: number): { min: number; max: number } {
  const max = dailyBudget * IMPRESSIONS_PER_RUPEE;
  const min = max - Math.round(max * 0.005);
  return { min, max };
}

const AUDIENCE_TYPE_BY_CODE: Record<number, BoostAudienceType> = {
  0: 'pan_india',
  1: 'state',
  2: 'city',
};

interface CreateBoostInput {
  type: 0 | 1 | 2;
  state?: string;
  city?: string;
  budget: number;
}

export async function createBoost(
  sellerId: string,
  productId: string,
  input: CreateBoostInput,
): Promise<ProductBoost> {
  const product = await Product.findOne({ where: { id: productId, sellerId } });
  if (!product) {
    throw Object.assign(new Error('Product not found'), { status: 404 });
  }

  const existing = await ProductBoost.findOne({ where: { productId, status: 'active' } });
  if (existing) {
    throw Object.assign(new Error('This product already has an active boost'), { status: 409 });
  }

  const audienceType = AUDIENCE_TYPE_BY_CODE[input.type];
  const { min, max } = estimateImpressions(input.budget);

  return ProductBoost.create({
    sellerId,
    productId,
    audienceType,
    state: audienceType === 'state' || audienceType === 'city' ? input.state : null,
    city: audienceType === 'city' ? input.city : null,
    dailyBudget: input.budget,
    estimatedImpressionsMin: min,
    estimatedImpressionsMax: max,
    status: 'active',
  });
}

export async function getActiveBoost(sellerId: string, productId: string): Promise<ProductBoost | null> {
  return ProductBoost.findOne({
    where: { sellerId, productId, status: 'active' },
    order: [['createdAt', 'DESC']],
  });
}
