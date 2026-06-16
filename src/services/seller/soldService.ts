import { Op } from 'sequelize';
import type { WhereOptions } from 'sequelize';
import { Product } from '../../models/Product';
import { ProductVariant } from '../../models/ProductVariant';
import { SoldLog } from '../../models/SoldLog';
import { syncProductStock } from './variantService';

export async function markProductSold(
  sellerId: string,
  productId: string,
  quantity: number,
): Promise<SoldLog> {
  const product = await Product.findOne({ where: { id: productId, sellerId } });
  if (!product) {
    throw Object.assign(new Error('Product not found'), { status: 404 });
  }

  const variantCount = await ProductVariant.count({ where: { productId } });
  if (variantCount > 0) {
    throw Object.assign(
      new Error('This product has variants — mark a specific variant as sold instead'),
      { status: 400 },
    );
  }

  if (quantity > product.stock) {
    throw Object.assign(
      new Error(`Cannot sell more than available stock (${product.stock})`),
      { status: 422 },
    );
  }

  const stockBefore = product.stock;
  const stockAfter  = stockBefore - quantity;
  await product.update({ stock: stockAfter });

  return SoldLog.create({
    sellerId,
    productId,
    variantId:   null,
    quantity,
    stockBefore,
    stockAfter,
    productName: product.name,
    variantInfo: null,
  });
}

export async function markVariantSold(
  sellerId: string,
  productId: string,
  variantId: string,
  quantity: number,
): Promise<SoldLog> {
  const product = await Product.findOne({ where: { id: productId, sellerId } });
  if (!product) {
    throw Object.assign(new Error('Product not found'), { status: 404 });
  }

  const variant = await ProductVariant.findOne({ where: { id: variantId, productId } });
  if (!variant) {
    throw Object.assign(new Error('Variant not found'), { status: 404 });
  }

  if (quantity > variant.stock) {
    throw Object.assign(
      new Error(`Cannot sell more than available stock (${variant.stock})`),
      { status: 422 },
    );
  }

  const stockBefore = variant.stock;
  const stockAfter  = stockBefore - quantity;
  await variant.update({ stock: stockAfter });
  await syncProductStock(productId);

  return SoldLog.create({
    sellerId,
    productId,
    variantId,
    quantity,
    stockBefore,
    stockAfter,
    productName: product.name,
    variantInfo: variant.attributes,
  });
}

export async function getSoldLogs(
  sellerId: string,
  page: number,
  limit: number,
  from?: string,
  to?: string,
): Promise<{ rows: SoldLog[]; count: number }> {
  const dateWhere = (from || to) ? {
    soldAt: {
      ...(from && { [Op.gte]: new Date(from) }),
      ...(to   && { [Op.lte]: new Date(to) }),
    },
  } : {};

  const where: WhereOptions = { sellerId, ...dateWhere };

  return SoldLog.findAndCountAll({
    where,
    order: [['soldAt', 'DESC']],
    limit,
    offset: (page - 1) * limit,
  });
}
