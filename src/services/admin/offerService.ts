import { Op } from 'sequelize';
import type { InferType } from 'yup';
import { Offer } from '../../models/Offer';
import { User } from '../../models/User';
import { SellerProfile } from '../../models/SellerProfile';
import { createNotification } from '../../services/customer/notificationService';
import { sendOfferNotificationEmail } from '../../utils/mailer';
import type { createOfferSchema, updateOfferSchema } from '../../validation/admin/offerSchemas';
import type { OfferConfig, OfferType } from '../../types';

type CreateOfferInput = InferType<typeof createOfferSchema>;
type UpdateOfferInput = InferType<typeof updateOfferSchema>;

const VALID_OFFER_SORT = new Set(['title', 'startDate', 'endDate', 'createdAt']);

interface ListOffersFilter {
  isActive?: boolean;
  offerType?: OfferType;
  search?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

function requirePositiveNumber(value: unknown, field: string): number {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) {
    throw Object.assign(new Error(`${field} must be a positive number`), { status: 422 });
  }
  return num;
}

function requirePercent(value: unknown, field: string): number {
  const num = requirePositiveNumber(value, field);
  if (num > 100) {
    throw Object.assign(new Error(`${field} must be between 1 and 100`), { status: 422 });
  }
  return num;
}

function validateOfferConfig(offerType: OfferType, config: Record<string, unknown>): OfferConfig {
  switch (offerType) {
    case 'percentage_off': {
      const discountPercent = requirePercent(config.discountPercent, 'discountPercent');
      const hasCap = config.maxDiscountCap !== undefined && config.maxDiscountCap !== null && config.maxDiscountCap !== '';
      if (!hasCap) return { discountPercent };
      const maxDiscountCap = requirePositiveNumber(config.maxDiscountCap, 'maxDiscountCap');
      return { discountPercent, maxDiscountCap };
    }
    case 'flat_amount_off': {
      const flatAmount = requirePositiveNumber(config.flatAmount, 'flatAmount');
      return { flatAmount };
    }
    case 'bogo': {
      const buyQty = requirePositiveNumber(config.buyQty, 'buyQty');
      const getQty = requirePositiveNumber(config.getQty, 'getQty');
      const getDiscountPercent = requirePercent(config.getDiscountPercent, 'getDiscountPercent');
      if (!Number.isInteger(buyQty) || !Number.isInteger(getQty)) {
        throw Object.assign(new Error('buyQty and getQty must be whole numbers'), { status: 422 });
      }
      return { buyQty, getQty, getDiscountPercent };
    }
  }
}

export async function listOffers(
  filters: ListOffersFilter = {},
  page = 1,
  limit = 20,
): Promise<{ rows: Offer[]; count: number }> {
  const where: Record<string, unknown> = {};
  if (filters.isActive !== undefined) where.isActive = filters.isActive;
  if (filters.offerType !== undefined) where.offerType = filters.offerType;
  if (filters.search) where.title = { [Op.iLike]: `%${filters.search}%` };

  const sortField = VALID_OFFER_SORT.has(filters.sortBy ?? '') ? (filters.sortBy as string) : 'createdAt';
  const sortOrder = filters.sortOrder ?? 'DESC';

  return Offer.findAndCountAll({
    where,
    order: [[sortField, sortOrder]],
    limit,
    offset: (page - 1) * limit,
  });
}

export async function getOfferById(id: number): Promise<Offer> {
  const offer = await Offer.findByPk(id);
  if (!offer) {
    throw Object.assign(new Error('Offer not found'), { status: 404 });
  }
  return offer;
}

function assertNotStarted(offer: Offer): void {
  if (new Date(offer.startDate).getTime() <= Date.now()) {
    throw Object.assign(
      new Error('This offer has already started and can no longer be modified'),
      { status: 409 },
    );
  }
}

async function notifySellersOfOffer(offer: Offer): Promise<void> {
  const sellers = await User.findAll({
    where: { role: 'SELLER' },
    include: [{ model: SellerProfile, attributes: ['email'] }],
  });

  const message = offer.description ?? `A new offer "${offer.title}" is available — open it to see the details.`;

  const results = await Promise.allSettled(
    sellers.map(async (seller) => {
      await createNotification(seller.id, offer.title, message, 'offer', 'offer', String(offer.id));

      const email = seller.sellerProfile?.email ?? seller.email;
      if (email) {
        await sendOfferNotificationEmail(email, offer.title, offer.description);
      }
    }),
  );

  // Fan-out runs synchronously in the request (no job queue in this codebase) —
  // one seller's email/DB failure must never block the rest or the offer creation itself.
  for (const result of results) {
    if (result.status === 'rejected') {
      console.error(`Offer ${offer.id} notification fan-out failed for a seller:`, result.reason);
    }
  }
}

export async function createOffer(data: CreateOfferInput, createdBy: string): Promise<Offer> {
  const offerType = data.offerType as OfferType;
  const config = validateOfferConfig(offerType, data.config as Record<string, unknown>);

  const offer = await Offer.create({
    title: data.title,
    description: data.description ?? null,
    startDate: data.startDate,
    endDate: data.endDate,
    offerType,
    config,
    createdBy,
  });

  await notifySellersOfOffer(offer);

  return getOfferById(offer.id);
}

export async function updateOffer(id: number, data: UpdateOfferInput): Promise<Offer> {
  const offer = await Offer.findByPk(id);
  if (!offer) {
    throw Object.assign(new Error('Offer not found'), { status: 404 });
  }
  assertNotStarted(offer);

  const updates: Record<string, unknown> = { ...data };

  if (data.offerType !== undefined || data.config !== undefined) {
    const effectiveType = (data.offerType as OfferType | undefined) ?? (offer.offerType as OfferType);
    const effectiveConfig = (data.config as Record<string, unknown> | undefined) ?? (offer.config as unknown as Record<string, unknown>);
    updates.config = validateOfferConfig(effectiveType, effectiveConfig);
  }

  await offer.update(updates);
  return getOfferById(id);
}

export async function toggleOffer(id: number): Promise<Offer> {
  const offer = await getOfferById(id);
  assertNotStarted(offer);
  offer.isActive = !offer.isActive;
  await offer.save();
  return offer;
}

export async function deleteOffer(id: number): Promise<void> {
  const offer = await Offer.findByPk(id);
  if (!offer) {
    throw Object.assign(new Error('Offer not found'), { status: 404 });
  }
  assertNotStarted(offer);
  await offer.destroy();
}
