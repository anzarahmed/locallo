import { Op } from 'sequelize';
import { ProductBoost } from '../../models/ProductBoost';
import { Product } from '../../models/Product';
import { User } from '../../models/User';
import { SellerProfile } from '../../models/SellerProfile';
import { getPresignedUrl } from '../../utils/imageStorage';
import type { BoostAudienceType, BoostStatus, PaymentStatus } from '../../types';

const VALID_PAYMENT_SORT = new Set(['createdAt', 'amount']);

interface ListPaymentsFilter {
  sellerId?: string;
  paymentStatus?: PaymentStatus;
  status?: BoostStatus;
  search?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface AdminPaymentRow {
  id: string;
  productId: string;
  productName: string;
  productImage: string | null;
  sellerId: string;
  sellerName: string;
  audienceType: BoostAudienceType;
  state: string | null;
  city: string | null;
  dailyBudget: number;
  impressionCount: number;
  status: BoostStatus;
  paymentStatus: PaymentStatus;
  amount: number;
  currency: string;
  createdAt: Date;
}

const SELLER_INCLUDE = {
  model: User,
  attributes: ['id', 'mobile', 'fullName'],
  include: [{ model: SellerProfile, attributes: ['businessName'] }],
};

export async function listAllPayments(
  filters: ListPaymentsFilter,
  page: number,
  limit: number,
): Promise<{ rows: AdminPaymentRow[]; count: number }> {
  const where: Record<string, unknown> = {};
  if (filters.sellerId)      where.sellerId = filters.sellerId;
  if (filters.paymentStatus) where.paymentStatus = filters.paymentStatus;
  if (filters.status)        where.status = filters.status;

  const hasSearch = Boolean(filters.search);
  const productWhere = hasSearch ? { name: { [Op.iLike]: `%${filters.search}%` } } : undefined;

  const sortField = VALID_PAYMENT_SORT.has(filters.sortBy ?? '') ? (filters.sortBy as string) : 'createdAt';
  const sortOrder = filters.sortOrder ?? 'DESC';

  const { rows, count } = await ProductBoost.findAndCountAll({
    where,
    include: [
      { model: Product, attributes: ['id', 'name', 'images'], where: productWhere, required: hasSearch },
      SELLER_INCLUDE,
    ],
    order: [[sortField, sortOrder]],
    limit,
    offset: (page - 1) * limit,
  });

  const signed = await Promise.all(
    rows.map(async (boost): Promise<AdminPaymentRow> => {
      const json = boost.toJSON() as ProductBoost & {
        product?: { id?: string; name?: string; images?: string[] };
        seller?: { id?: string; mobile?: string; fullName?: string | null; sellerProfile?: { businessName?: string } | null };
      };
      const firstKey = json.product?.images?.[0] ?? null;
      const productImage = firstKey ? await getPresignedUrl(firstKey) : null;
      return {
        id:              json.id,
        productId:       json.productId,
        productName:     json.product?.name ?? 'Product',
        productImage,
        sellerId:        json.sellerId,
        sellerName:      json.seller?.sellerProfile?.businessName ?? json.seller?.fullName ?? json.seller?.mobile ?? 'Seller',
        audienceType:    json.audienceType,
        state:           json.state,
        city:            json.city,
        dailyBudget:     json.dailyBudget,
        impressionCount: json.impressionCount,
        status:          json.status,
        paymentStatus:   json.paymentStatus,
        amount:          json.amount,
        currency:        json.currency,
        createdAt:       json.createdAt,
      };
    }),
  );

  return { rows: signed, count };
}
