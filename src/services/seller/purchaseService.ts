import { Op, type Transaction } from 'sequelize';
import type { WhereOptions } from 'sequelize';
import { Product } from '../../models/Product';
import { Category } from '../../models/Category';
import { PurchaseLog } from '../../models/PurchaseLog';
import { getPresignedUrl } from '../../utils/imageStorage';
import { normalizeFreeTextAttributes } from '../../utils/attributeDisplay';
import type { AttributeField } from '../../types';

export interface RecordPurchaseInput {
  sellerId: string;
  productId: string;
  variantId?: string | null;
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  productName: string;
  variantInfo?: Record<string, unknown> | null;
  costPriceAtPurchase?: number | null;
}

export async function recordPurchase(
  input: RecordPurchaseInput,
  transaction?: Transaction,
): Promise<PurchaseLog | null> {
  if (input.quantity === 0) return null;

  return PurchaseLog.create(
    {
      sellerId:            input.sellerId,
      productId:           input.productId,
      variantId:           input.variantId ?? null,
      quantity:            input.quantity,
      stockBefore:         input.stockBefore,
      stockAfter:          input.stockAfter,
      productName:         input.productName,
      variantInfo:         input.variantInfo ?? null,
      costPriceAtPurchase: input.costPriceAtPurchase ?? null,
    },
    { transaction },
  );
}

export interface PurchaseLogRow {
  id: string;
  productId: string | null;
  variantId: string | null;
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  productName: string;
  variantInfo: Record<string, unknown> | null;
  purchasedAt: Date;
  productImage: string | null;
}

export async function getPurchaseLogs(
  sellerId: string,
  page: number,
  limit: number,
  from?: string,
  to?: string,
): Promise<{ rows: PurchaseLogRow[]; count: number }> {
  const dateWhere = (from || to) ? {
    purchasedAt: {
      ...(from && { [Op.gte]: new Date(from) }),
      ...(to   && { [Op.lte]: new Date(to) }),
    },
  } : {};

  const where: WhereOptions = { sellerId, ...dateWhere };

  const { rows, count } = await PurchaseLog.findAndCountAll({
    where,
    include: [{ model: Product, attributes: ['images', 'categoryId'], required: false }],
    order: [['purchasedAt', 'DESC']],
    limit,
    offset: (page - 1) * limit,
  });

  const categoryIds = [...new Set(
    rows.map((log) => (log.toJSON() as PurchaseLog & { product?: { categoryId?: number } }).product?.categoryId).filter((id): id is number => id !== undefined),
  )];
  const categories = categoryIds.length > 0
    ? await Category.findAll({ where: { id: { [Op.in]: categoryIds } }, attributes: ['id', 'attributeSchema'] })
    : [];
  const schemaByCategory = new Map(categories.map((c) => [c.id, (c.attributeSchema as AttributeField[] | undefined) ?? []]));

  const signed = await Promise.all(
    rows.map(async (log): Promise<PurchaseLogRow> => {
      const json = log.toJSON() as PurchaseLog & { product?: { images?: string[]; categoryId?: number } };
      const firstKey = json.product?.images?.[0] ?? null;
      const productImage = firstKey ? await getPresignedUrl(firstKey) : null;
      const schema = json.product?.categoryId !== undefined ? schemaByCategory.get(json.product.categoryId) ?? [] : [];
      return {
        id:           json.id,
        productId:    json.productId,
        variantId:    json.variantId,
        quantity:     json.quantity,
        stockBefore:  json.stockBefore,
        stockAfter:   json.stockAfter,
        productName:  json.productName,
        variantInfo:  json.variantInfo ? normalizeFreeTextAttributes(json.variantInfo, schema) : null,
        purchasedAt:  json.purchasedAt,
        productImage,
      };
    }),
  );

  return { rows: signed, count };
}
