import { Op } from 'sequelize';
import { ProductVariant } from '../../models/ProductVariant';

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

export function pickVariantForSearch(
  variants: ProductVariant[],
  search?: string,
): ProductVariant | null {
  if (variants.length === 0) return null;

  const tokens = (search ?? '').toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return variants[0];

  let best = variants[0];
  let bestScore = -1;

  for (const variant of variants) {
    const haystack = Object.values(variant.attributes as Record<string, unknown>)
      .map((value) => String(value))
      .join(' ')
      .toLowerCase();
    const score = tokens.reduce((sum, token) => sum + (haystack.includes(token) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      best = variant;
    }
  }

  return best;
}
