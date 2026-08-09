import { Op } from 'sequelize';
import { Offer } from '../models/Offer';
import { OfferProduct } from '../models/OfferProduct';
import type { BogoConfig, FlatAmountOffConfig, OfferType, PercentageOffConfig } from '../types';

export interface OfferPricing {
  offerPrice: number | null;
  offerBadge: string | null;
}

export async function getActiveOffersForProducts(productIds: string[]): Promise<Map<string, Offer>> {
  if (productIds.length === 0) return new Map();

  const now = new Date();
  const rows = await OfferProduct.findAll({
    where: { productId: { [Op.in]: productIds } },
    include: [{
      model: Offer,
      required: true,
      where: {
        isActive: true,
        startDate: { [Op.lte]: now },
        endDate: { [Op.gte]: now },
      },
    }],
  });

  // If more than one active offer applies to a product, the most recently created wins.
  const map = new Map<string, Offer>();
  for (const row of rows) {
    const existing = map.get(row.productId);
    if (!existing || row.offer.createdAt > existing.createdAt) {
      map.set(row.productId, row.offer);
    }
  }
  return map;
}

export function computeOfferPricing(offer: Offer, sellingPrice: number): OfferPricing {
  switch (offer.offerType as OfferType) {
    case 'percentage_off': {
      const { discountPercent, maxDiscountCap } = offer.config as PercentageOffConfig;
      const rawDiscount = sellingPrice * (discountPercent / 100);
      const discount = maxDiscountCap !== undefined ? Math.min(rawDiscount, maxDiscountCap) : rawDiscount;
      return { offerPrice: Math.max(0, sellingPrice - discount), offerBadge: null };
    }
    case 'flat_amount_off': {
      const { flatAmount } = offer.config as FlatAmountOffConfig;
      return { offerPrice: Math.max(0, sellingPrice - flatAmount), offerBadge: null };
    }
    case 'bogo': {
      const { buyQty, getQty, getDiscountPercent } = offer.config as BogoConfig;
      const offerBadge = getDiscountPercent >= 100
        ? `Buy ${buyQty} Get ${getQty} Free`
        : `Buy ${buyQty} Get ${getQty} at ${getDiscountPercent}% off`;
      return { offerPrice: null, offerBadge };
    }
  }
}
