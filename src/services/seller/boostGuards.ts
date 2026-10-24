import { Op, type Transaction } from 'sequelize';
import { ProductBoost } from '../../models/ProductBoost';

// A live paid boost must always have something visible to show, so a product can't be
// hidden or deleted out from under one.
export async function assertNoLiveBoost(productId: string, action: 'hidden' | 'deleted'): Promise<void> {
  if (await hasLiveBoost(productId)) {
    throw Object.assign(
      new Error(`This product is currently boosted and cannot be ${action} while the boost is active.`),
      { status: 409 },
    );
  }
}

export async function hasLiveBoost(productId: string): Promise<boolean> {
  const live = await ProductBoost.count({ where: { productId, status: 'active', paymentStatus: 'paid' } });
  return live > 0;
}

// 'completed' (not 'cancelled') because a paid+cancelled row means a refund is owed, and
// a seller ending their own promotion by deleting what it shows is not refunded.
export async function completeLiveBoosts(
  where: Record<string | symbol, unknown>,
  transaction?: Transaction,
): Promise<number> {
  const [completed] = await ProductBoost.update(
    { status: 'completed' },
    { where: { ...where, status: 'active', paymentStatus: 'paid' }, transaction },
  );
  return completed;
}

// Unpaid boosts would otherwise go live on payment with nothing to show; cancelling here
// mirrors what createBoost does to a superseded pending boost. Returns how many were
// cancelled so the seller can be told.
export async function cancelPendingBoosts(
  where: Record<string | symbol, unknown>,
  transaction?: Transaction,
): Promise<number> {
  const [cancelled] = await ProductBoost.update(
    { status: 'cancelled', paymentStatus: 'cancelled' },
    { where: { ...where, status: 'pending', paymentStatus: { [Op.ne]: 'paid' } }, transaction },
  );
  return cancelled;
}
