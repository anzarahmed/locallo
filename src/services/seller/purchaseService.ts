import { Op, type Transaction } from 'sequelize';
import type { WhereOptions } from 'sequelize';
import { Product } from '../../models/Product';
import { PurchaseLog } from '../../models/PurchaseLog';
import { getPresignedUrl } from '../../utils/imageStorage';

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
  if (input.quantity <= 0) return null;

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
    include: [{ model: Product, attributes: ['images'], required: false }],
    order: [['purchasedAt', 'DESC']],
    limit,
    offset: (page - 1) * limit,
  });

  const signed = await Promise.all(
    rows.map(async (log): Promise<PurchaseLogRow> => {
      const json = log.toJSON() as PurchaseLog & { product?: { images?: string[] } };
      const firstKey = json.product?.images?.[0] ?? null;
      const productImage = firstKey ? await getPresignedUrl(firstKey) : null;
      return {
        id:           json.id,
        productId:    json.productId,
        variantId:    json.variantId,
        quantity:     json.quantity,
        stockBefore:  json.stockBefore,
        stockAfter:   json.stockAfter,
        productName:  json.productName,
        variantInfo:  json.variantInfo,
        purchasedAt:  json.purchasedAt,
        productImage,
      };
    }),
  );

  return { rows: signed, count };
}
