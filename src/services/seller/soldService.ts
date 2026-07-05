import { Op } from 'sequelize';
import type { WhereOptions } from 'sequelize';
import { Product } from '../../models/Product';
import { ProductVariant } from '../../models/ProductVariant';
import { SoldLog } from '../../models/SoldLog';
import { syncProductStock } from './variantService';
import { getPresignedUrl } from '../../utils/imageStorage';

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

export interface SoldLogRow {
  id: string;
  productId: string | null;
  variantId: string | null;
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  productName: string;
  variantInfo: Record<string, unknown> | null;
  soldAt: Date;
  productImage: string | null;
}

export async function getSoldLogs(
  sellerId: string,
  page: number,
  limit: number,
  from?: string,
  to?: string,
): Promise<{ rows: SoldLogRow[]; count: number }> {
  const dateWhere = (from || to) ? {
    soldAt: {
      ...(from && { [Op.gte]: new Date(from) }),
      ...(to   && { [Op.lte]: new Date(to) }),
    },
  } : {};

  const where: WhereOptions = { sellerId, ...dateWhere };

  const { rows, count } = await SoldLog.findAndCountAll({
    where,
    include: [{ model: Product, attributes: ['images'], required: false }],
    order: [['soldAt', 'DESC']],
    limit,
    offset: (page - 1) * limit,
  });

  const signed = await Promise.all(
    rows.map(async (log): Promise<SoldLogRow> => {
      const json = log.toJSON() as SoldLog & { product?: { images?: string[] } };
      const firstKey = json.product?.images?.[0] ?? null;
      const productImage = firstKey ? await getPresignedUrl(firstKey) : null;
      return {
        id:          json.id,
        productId:   json.productId,
        variantId:   json.variantId,
        quantity:    json.quantity,
        stockBefore: json.stockBefore,
        stockAfter:  json.stockAfter,
        productName: json.productName,
        variantInfo: json.variantInfo,
        soldAt:      json.soldAt,
        productImage,
      };
    }),
  );

  return { rows: signed, count };
}
