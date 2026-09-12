import { Op } from 'sequelize';
import { ProductVariant } from '../../models/ProductVariant';
import { matchesToken } from '../../utils/searchTokens';
import type { AttributeField } from '../../types';

const VARIANT_ATTRIBUTES = ['id', 'productId', 'attributes', 'images', 'stock', 'sellingPrice', 'mrp', 'isActive'];

export async function getActiveVariantsByProduct(
  productIds: string[],
): Promise<Map<string, ProductVariant[]>> {
  const grouped = new Map<string, ProductVariant[]>();
  if (productIds.length === 0) return grouped;

  const variants = await ProductVariant.findAll({
    where: { productId: { [Op.in]: productIds }, isActive: true },
    order: [['createdAt', 'ASC'], ['id', 'ASC']],
    attributes: VARIANT_ATTRIBUTES,
  });

  for (const variant of variants) {
    const list = grouped.get(variant.productId);
    if (list) list.push(variant);
    else grouped.set(variant.productId, [variant]);
  }

  return grouped;
}

function attributeHaystack(attributes: Record<string, unknown>, schema?: AttributeField[]): string {
  const fieldsByKey = new Map((schema ?? []).map((field) => [field.key, field]));
  const parts: string[] = [];

  for (const [key, value] of Object.entries(attributes)) {
    const field = fieldsByKey.get(key);
    for (const entry of Array.isArray(value) ? value : [value]) {
      parts.push(String(entry));
      const option = field?.options?.find((opt) => opt.value === String(entry));
      if (option) parts.push(option.label);
    }
  }

  return parts.join(' ');
}

export function pickVariantForSearch(
  variants: ProductVariant[],
  search?: string,
  productName?: string,
  attributeSchema?: AttributeField[],
): ProductVariant | null {
  if (variants.length === 0) return null;

  const tokens = (search ?? '').toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return variants[0];

  const remainingTokens = tokens.filter((token) => !matchesToken(productName ?? '', token));
  if (remainingTokens.length === 0) return variants[0];

  let best = variants[0];
  let bestScore = -1;

  for (const variant of variants) {
    const haystack = attributeHaystack(variant.attributes as Record<string, unknown>, attributeSchema);
    const score = remainingTokens.reduce((sum, token) => sum + (matchesToken(haystack, token) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      best = variant;
    }
  }

  return best;
}
