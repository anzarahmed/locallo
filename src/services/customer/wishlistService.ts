import { Op, literal } from 'sequelize';
import { Wishlist } from '../../models/Wishlist';
import { Product } from '../../models/Product';
import { ProductVariant } from '../../models/ProductVariant';
import { SellerProfile } from '../../models/SellerProfile';
import { hasVisibleVariantsSql, inStockSql } from './productService';

const LIST_ATTRIBUTES = ['id', 'name', 'mrp', 'sellingPrice', 'images', 'sellerId', 'categoryId'];
const VARIANT_ATTRIBUTES = ['id', 'attributes', 'images', 'stock', 'sellingPrice', 'mrp', 'isActive'];

// The wishlist is the only customer listing that keeps out-of-stock items, so stock is
// returned as a flag instead of filtering; a variant hidden by the seller is still dropped.
const WISHLIST_VISIBLE_CONDITION = literal(
  '(CASE WHEN "Wishlist".variant_id IS NULL ' +
  `THEN ${hasVisibleVariantsSql('"Wishlist".product_id')} ` +
  'ELSE EXISTS (SELECT 1 FROM product_variants wv WHERE wv.id = "Wishlist".variant_id AND wv.is_active = true) END)',
);

const WISHLIST_IN_STOCK_SQL =
  'CASE WHEN "Wishlist".variant_id IS NOT NULL ' +
  'THEN EXISTS (SELECT 1 FROM product_variants wv WHERE wv.id = "Wishlist".variant_id AND wv.stock > 0) ' +
  `ELSE ${inStockSql('"Wishlist".product_id', '(SELECT stock FROM products WHERE products.id = "Wishlist".product_id)')} END`;

async function hasVisibleVariants(productId: string): Promise<boolean> {
  const variantCount = await ProductVariant.count({ where: { productId } });
  if (variantCount === 0) return true;
  return (await ProductVariant.count({ where: { productId, isActive: true } })) > 0;
}

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

  if (!variantId && !(await hasVisibleVariants(productId))) {
    throw Object.assign(new Error('Product not found'), { status: 404 });
  }

  await Wishlist.create({ customerId, productId, variantId: variantId ?? null });
  return true;
}

export async function listWishlist(
  customerId: string,
  page: number,
  limit: number,
): Promise<{ rows: Wishlist[]; count: number }> {
  return Wishlist.findAndCountAll({
    attributes: { include: [[literal(WISHLIST_IN_STOCK_SQL), 'inStock']] },
    where: { customerId, [Op.and]: [WISHLIST_VISIBLE_CONDITION] },
    include: [
      {
        model: Product,
        attributes: [...LIST_ATTRIBUTES, 'stock'],
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
}

export async function getSellerLocations(
  sellerIds: string[],
): Promise<Map<string, { lat: number | null; long: number | null }>> {
  const map = new Map<string, { lat: number | null; long: number | null }>();
  if (sellerIds.length === 0) return map;

  const profiles = await SellerProfile.findAll({
    attributes: ['userId', 'lat', 'long'],
    where: { userId: { [Op.in]: sellerIds } },
  });

  for (const p of profiles) {
    map.set(p.userId, { lat: p.lat ?? null, long: p.long ?? null });
  }
  return map;
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

export async function getProductWishlistState(
  customerId: string,
  productId: string,
): Promise<{ productWishlisted: boolean; wishlistedVariantIds: Set<string> }> {
  const rows = await Wishlist.findAll({
    attributes: ['variantId'],
    where: { customerId, productId },
  });

  return {
    productWishlisted: rows.some((r) => r.variantId === null),
    wishlistedVariantIds: new Set(rows.filter((r) => r.variantId !== null).map((r) => r.variantId as string)),
  };
}
