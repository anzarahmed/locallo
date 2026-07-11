import { Op } from 'sequelize';
import { Wishlist } from '../../models/Wishlist';
import { Product } from '../../models/Product';

const LIST_ATTRIBUTES = ['id', 'name', 'mrp', 'sellingPrice', 'images'];

export async function toggleWishlist(customerId: string, productId: string): Promise<boolean> {
  const product = await Product.findOne({ where: { id: productId, isActive: true } });
  if (!product) {
    throw Object.assign(new Error('Product not found'), { status: 404 });
  }

  const existing = await Wishlist.findOne({ where: { customerId, productId } });
  if (existing) {
    await existing.destroy();
    return false;
  }

  await Wishlist.create({ customerId, productId });
  return true;
}

export async function listWishlist(
  customerId: string,
  page: number,
  limit: number,
): Promise<{ rows: Product[]; count: number }> {
  const { rows, count } = await Wishlist.findAndCountAll({
    where: { customerId },
    include: [
      {
        model: Product,
        attributes: LIST_ATTRIBUTES,
        where: { isActive: true },
        required: true,
      },
    ],
    order: [['createdAt', 'DESC']],
    limit,
    offset: (page - 1) * limit,
  });

  return { rows: rows.map((w) => w.product), count };
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

export async function isProductWishlisted(customerId: string, productId: string): Promise<boolean> {
  const row = await Wishlist.findOne({ where: { customerId, productId } });
  return row !== null;
}
