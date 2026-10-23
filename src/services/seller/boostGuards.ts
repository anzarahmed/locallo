import { Op, type Transaction } from 'sequelize';
import { ProductBoost } from '../../models/ProductBoost';

// A live paid boost must always have something visible to show, so a product can't be
// hidden or deleted out from under one.
export async function assertNoLiveBoost(productId: string, action: 'hidden' | 'deleted'): Promise<void> {
  const live = await ProductBoost.count({ where: { productId, status: 'active', paymentStatus: 'paid' } });
  if (live > 0) {
    throw Object.assign(
      new Error(`This product is currently boosted and cannot be ${action} while the boost is active.`),
      { status: 409 },
    );
  }
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
