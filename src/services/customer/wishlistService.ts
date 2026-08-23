import { Op } from 'sequelize';
import { Wishlist } from '../../models/Wishlist';
import { Product } from '../../models/Product';
import { ProductVariant } from '../../models/ProductVariant';

const LIST_ATTRIBUTES = ['id', 'name', 'mrp', 'sellingPrice', 'images'];
const VARIANT_ATTRIBUTES = ['id', 'attributes', 'images', 'sellingPrice', 'mrp'];

export async function toggleWishlist(
  customerId: string,
  productId: string,
  variantId?: string,
): Promise<boolean> {
  const product = await Product.findOne({ where: { id: productId, isActive: true } });
  if (!product) {
    throw Object.assign(new Error('Product not found'), { status: 404 });
  }

  if (variantId) {
    const variant = await ProductVariant.findOne({ where: { id: variantId, productId, isActive: true } });
    if (!variant) {
      throw Object.assign(new Error('Variant not found'), { status: 404 });
    }
  }

  const existing = await Wishlist.findOne({ where: { customerId, productId, variantId: variantId ?? null } });
  if (existing) {
    await existing.destroy();
    return false;
  }

  await Wishlist.create({ customerId, productId, variantId: variantId ?? null });
  return true;
}

export async function listWishlist(
  customerId: string,
  page: number,
  limit: number,
): Promise<{ rows: Wishlist[]; count: number }> {
  const { rows, count } = await Wishlist.findAndCountAll({
    where: { customerId },
    include: [
      {
        model: Product,
        attributes: LIST_ATTRIBUTES,
        where: { isActive: true },
        required: true,
      },
      {
        model: ProductVariant,
        attributes: VARIANT_ATTRIBUTES,
        required: false,
      },
    ],
    order: [['createdAt', 'DESC']],
    limit,
    offset: (page - 1) * limit,
  });

  return { rows, count };
}

export async function getWishlistedProductIds(
  customerId: string,
  productIds: string[],
): Promise<Set<string>> {
  if (productIds.length === 0) return new Set();

  const rows = await Wishlist.findAll({
    attributes: ['productId'],
    where: { customerId, productId: { [Op.in]: productIds } },
  });

  return new Set(rows.map((r) => r.productId));
}

export async function isProductWishlisted(
  customerId: string,
  productId: string,
  variantId?: string,
): Promise<boolean> {
  const row = await Wishlist.findOne({ where: { customerId, productId, variantId: variantId ?? null } });
  return row !== null;
}
