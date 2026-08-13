import { Op } from 'sequelize';
import { ProductView } from '../../models/ProductView';

export async function recordProductView(customerId: string, productId: string, sellerId: string): Promise<void> {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const existing = await ProductView.findOne({
      where: { customerId, productId, viewedAt: { [Op.gte]: startOfToday } },
    });
    if (existing) return;

    await ProductView.create({ customerId, productId, sellerId });
  } catch (err) {
    console.error('Failed to record product view', err);
  }
}
