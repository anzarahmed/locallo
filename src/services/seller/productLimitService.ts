import { Op, fn, col, type Transaction, type WhereOptions } from 'sequelize';
import { Category } from '../../models/Category';
import { SellerProfile } from '../../models/SellerProfile';
import { ProductLimitLog, type ProductLimitReason } from '../../models/ProductLimitLog';
import { notifySafely } from '../notifications/notifyService';

export interface CategoryLimit {
  categoryId: number;
  categoryName: string;
  limit: number;
  used: number;
  remaining: number;
}

export interface ConsumeUnitsInput {
  sellerId: string;
  category: Category;
  productId: string;
  productName: string;
  groupLabel: string | null;
  reason: Exclude<ProductLimitReason, 'initial_balance'>;
}

export interface LimitUsage {
  sellerId: string;
  categoryId: number;
  categoryName: string;
  used: number;
  limit: number;
}

const NINETY_PERCENT = 0.9;

function limitReachedError(category: Category): Error {
  return Object.assign(
    new Error(
      `You've reached your listing limit for ${category.name} (${category.productLimit}). ` +
      'Deleted products and variant groups do not restore units.',
    ),
    { status: 403 },
  );
}

async function countUsed(sellerId: string, categoryId: number, transaction?: Transaction): Promise<number> {
  const used = await ProductLimitLog.sum('units', { where: { sellerId, categoryId }, transaction });
  return (used as number | null) ?? 0;
}

// Pre-check before any S3 side effects; consumeUnit re-checks under the lock.
export async function assertCanAdd(sellerId: string, category: Category, units = 1): Promise<void> {
  if (units === 0) return;
  if ((await countUsed(sellerId, category.id)) + units > category.productLimit) {
    throw limitReachedError(category);
  }
}

// Returns usage when this unit crossed 90% or filled the limit, so the caller can notify after commit.
export async function consumeUnit(t: Transaction, input: ConsumeUnitsInput): Promise<LimitUsage | null> {
  const { sellerId, category } = input;
  await Category.sequelize!.query(
    `SELECT pg_advisory_xact_lock(hashtext(:key))`,
    { replacements: { key: `product_limit:${sellerId}:${category.id}` }, transaction: t },
  );

  const locked = await Category.findByPk(category.id, { attributes: ['id', 'name', 'productLimit'], transaction: t });
  const limit = locked?.productLimit ?? category.productLimit;
  const usedBefore = await countUsed(sellerId, category.id, t);
  const usedAfter = usedBefore + 1;
  if (usedAfter > limit) throw limitReachedError(locked ?? category);

  await ProductLimitLog.create({
    sellerId,
    categoryId:     category.id,
    categoryName:   locked?.name ?? category.name,
    productId:      input.productId,
    productName:    input.productName,
    groupLabel:     input.groupLabel,
    reason:         input.reason,
    units:          1,
    usedAfter,
    limitAtTime:    limit,
    remainingAfter: limit - usedAfter,
  }, { transaction: t });

  if (limit === 0) return null;
  const threshold = Math.ceil(limit * NINETY_PERCENT);
  const crossedNinety = usedBefore < threshold && usedAfter >= threshold;
  if (!crossedNinety && usedAfter < limit) return null;
  return { sellerId, categoryId: category.id, categoryName: locked?.name ?? category.name, used: usedAfter, limit };
}

export async function consumeGroupUnits(
  t: Transaction,
  input: Omit<ConsumeUnitsInput, 'groupLabel' | 'reason'>,
  groupLabels: (string | null)[],
): Promise<LimitUsage | null> {
  let crossed: LimitUsage | null = null;
  for (const [i, groupLabel] of groupLabels.entries()) {
    const usage = await consumeUnit(t, { ...input, groupLabel, reason: 'variant_group' });
    // The seller sees this count, so include the units the batch adds after the crossing one.
    if (usage) crossed = { ...usage, used: usage.used + groupLabels.length - i - 1 };
  }
  return crossed;
}

export function notifyLimitThreshold(usage: LimitUsage | null): void {
  if (!usage) return;
  // A single add can cross both thresholds (a batch, or any limit under 10); only the full alert goes out then.
  const type = usage.used >= usage.limit ? 'upload_limit_100' : 'upload_limit_90';
  void notifySafely(
    usage.sellerId,
    type,
    { categoryId: usage.categoryId, categoryName: usage.categoryName, used: usage.used, limit: usage.limit },
    // The limit is in the key so raising it re-arms the alert for the new ceiling.
    { dedupeKey: `${type}:${usage.sellerId}:${usage.categoryId}:${usage.limit}` },
  );
}

export async function getSellerLimits(sellerId: string): Promise<CategoryLimit[]> {
  const profile = await SellerProfile.findOne({ where: { userId: sellerId }, attributes: ['categoryIds'] });
  const categoryIds = (profile?.categoryIds as number[] | null) ?? [];
  if (categoryIds.length === 0) return [];

  const [categories, usage] = await Promise.all([
    Category.findAll({
      where: { id: { [Op.in]: categoryIds } },
      attributes: ['id', 'name', 'productLimit'],
      order: [['name', 'ASC']],
    }),
    ProductLimitLog.findAll({
      where: { sellerId, categoryId: { [Op.in]: categoryIds } },
      attributes: ['categoryId', [fn('SUM', col('units')), 'used']],
      group: ['categoryId'],
      raw: true,
    }) as unknown as Promise<{ categoryId: number; used: string }[]>,
  ]);

  const usedByCategory = new Map(usage.map(u => [u.categoryId, Number(u.used)]));
  return categories.map(c => {
    const used = usedByCategory.get(c.id) ?? 0;
    return {
      categoryId:   c.id,
      categoryName: c.name,
      limit:        c.productLimit,
      used,
      remaining:    Math.max(0, c.productLimit - used),
    };
  });
}

export async function listLimitLogs(
  sellerId: string,
  page: number,
  limit: number,
  categoryId?: number,
): Promise<{ rows: ProductLimitLog[]; count: number }> {
  const where: WhereOptions = { sellerId, ...(categoryId !== undefined && { categoryId }) };
  return ProductLimitLog.findAndCountAll({
    where,
    attributes: [
      'id', 'categoryId', 'categoryName', 'productId', 'productName', 'groupLabel',
      'reason', 'units', 'usedAfter', 'limitAtTime', 'remainingAfter', 'createdAt',
    ],
    order: [['createdAt', 'DESC'], ['id', 'DESC']],
    limit,
    offset: (page - 1) * limit,
  });
}
