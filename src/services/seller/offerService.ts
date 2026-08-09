import { Op, fn, col } from 'sequelize';
import { Offer } from '../../models/Offer';
import { OfferProduct } from '../../models/OfferProduct';
import { Product } from '../../models/Product';
import sequelize from '../../config/database';

export async function listOffersForSeller(page: number, limit: number): Promise<{ rows: Offer[]; count: number }> {
  return Offer.findAndCountAll({
    order: [['createdAt', 'DESC']],
    limit,
    offset: (page - 1) * limit,
  });
}

export interface AcceptedOfferRow {
  offer: Offer;
  acceptedCount: number;
}

export async function listAcceptedOffersForSeller(
  sellerId: string,
  page: number,
  limit: number,
): Promise<{ rows: AcceptedOfferRow[]; count: number }> {
  const distinctOfferIds = await OfferProduct.findAll({
    where: { sellerId },
    attributes: [[fn('DISTINCT', col('offer_id')), 'offerId']],
    raw: true,
  }) as unknown as { offerId: number }[];
  const offerIds = distinctOfferIds.map(r => r.offerId);

  if (offerIds.length === 0) {
    return { rows: [], count: 0 };
  }

  const { rows: offers, count } = await Offer.findAndCountAll({
    where: { id: { [Op.in]: offerIds } },
    order: [['createdAt', 'DESC']],
    limit,
    offset: (page - 1) * limit,
  });

  const counts = await OfferProduct.findAll({
    where: { sellerId, offerId: { [Op.in]: offers.map(o => o.id) } },
    attributes: ['offerId', [fn('COUNT', col('id')), 'count']],
    group: ['offer_id'],
    raw: true,
  }) as unknown as { offerId: number; count: string }[];
  const countMap = new Map(counts.map(c => [c.offerId, Number(c.count)]));

  const rows = offers.map(offer => ({ offer, acceptedCount: countMap.get(offer.id) ?? 0 }));
  return { rows, count };
}

async function getAcceptedProductIds(offerId: number, sellerId: string): Promise<string[]> {
  const rows = await OfferProduct.findAll({ where: { offerId, sellerId }, attributes: ['productId'] });
  return rows.map(r => r.productId);
}

async function getAcceptedProducts(offerId: number, sellerId: string): Promise<Product[]> {
  const rows = await OfferProduct.findAll({
    where: { offerId, sellerId },
    include: [Product],
  });
  return rows.map(r => r.product).filter((p): p is Product => p != null);
}

export async function getOfferForSeller(
  offerId: number,
  sellerId: string,
): Promise<{ offer: Offer; acceptedProducts: Product[] }> {
  const offer = await Offer.findByPk(offerId);
  if (!offer) {
    throw Object.assign(new Error('Offer not found'), { status: 404 });
  }
  const acceptedProducts = await getAcceptedProducts(offerId, sellerId);
  return { offer, acceptedProducts };
}

export async function acceptOffer(
  offerId: number,
  sellerId: string,
  productIds: string[],
): Promise<string[]> {
  const offer = await Offer.findByPk(offerId);
  if (!offer) {
    throw Object.assign(new Error('Offer not found'), { status: 404 });
  }

  if (new Date() >= new Date(offer.startDate)) {
    throw Object.assign(new Error('Product selection is locked once the offer has started'), { status: 400 });
  }

  const uniqueIds = [...new Set(productIds)];

  if (uniqueIds.length > 0) {
    const owned = await Product.count({ where: { id: { [Op.in]: uniqueIds }, sellerId, isActive: true } });
    if (owned !== uniqueIds.length) {
      throw Object.assign(new Error('One or more products do not belong to you or are inactive'), { status: 422 });
    }
  }

  await sequelize.transaction(async (t) => {
    await OfferProduct.destroy({ where: { offerId, sellerId }, transaction: t });
    if (uniqueIds.length > 0) {
      await OfferProduct.bulkCreate(
        uniqueIds.map(productId => ({ offerId, sellerId, productId })),
        { transaction: t },
      );
    }
  });

  return getAcceptedProductIds(offerId, sellerId);
}
