import { Op } from 'sequelize';
import { Offer } from '../../models/Offer';

export async function listActiveOffers(page: number, limit: number): Promise<{ rows: Offer[]; count: number }> {
  const now = new Date();
  return Offer.findAndCountAll({
    where: {
      isActive: true,
      startDate: { [Op.lte]: now },
      endDate: { [Op.gte]: now },
    },
    order: [['endDate', 'ASC']],
    limit,
    offset: (page - 1) * limit,
  });
}
