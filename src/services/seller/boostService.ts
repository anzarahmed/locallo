import { Op, literal } from 'sequelize';
import { Product } from '../../models/Product';
import { ProductVariant } from '../../models/ProductVariant';
import { ProductBoost } from '../../models/ProductBoost';
import { User } from '../../models/User';
import { SellerProfile } from '../../models/SellerProfile';
import { Category } from '../../models/Category';
import { getGroupOptions } from './variantService';
import { inStockCondition } from '../customer/productService';
import { createRazorpayOrder } from '../../utils/razorpay';
import { sendBoostPaymentConfirmedEmail, sendBoostPaymentFailedEmail } from '../../utils/mailer';
import { getPresignedUrl } from '../../utils/imageStorage';
import type { BoostAudienceType, BoostStatus, PaymentStatus } from '../../types';

const IMPRESSIONS_PER_RUPEE = 20;
const RANGE_SPREAD = 100;

export function estimateImpressions(dailyBudget: number): { min: number; max: number } {
  const max = dailyBudget * IMPRESSIONS_PER_RUPEE;
  return { min: Math.max(max - RANGE_SPREAD, 0), max };
}

const AUDIENCE_TYPE_BY_CODE: Record<number, BoostAudienceType> = {
  0: 'pan_india',
  1: 'state',
  2: 'city',
};

interface CreateBoostInput {
  type: 0 | 1 | 2;
  state?: string;
  city?: string;
  budget: number;
  variantId?: string | null;
  variantIds?: string[] | null;
}

interface PromotedOptions {
  variantId: string | null;
  variantIds: string[] | null;
}

// The server is authoritative: any one option of a group (legacy single variantId from
// older app builds included) expands to every active option in that group, frozen here.
async function resolvePromotedOptions(product: Product, input: CreateBoostInput): Promise<PromotedOptions> {
  const requestedIds = input.variantIds ?? (input.variantId ? [input.variantId] : []);

  if (requestedIds.length === 0) {
    // Same stock rule the customer listings apply, so a paid whole-product boost can be shown.
    const inStock = await Product.count({ where: { id: product.id, [Op.and]: [inStockCondition()] } });
    if (inStock === 0) {
      throw Object.assign(new Error('This product is out of stock and cannot be promoted'), { status: 422 });
    }
    return { variantId: null, variantIds: null };
  }

  const productVariants = await ProductVariant.findAll({
    where: { productId: product.id },
    order: [['createdAt', 'ASC'], ['id', 'ASC']],
  });
  const variantById = new Map(productVariants.map(v => [v.id, v]));
  if (requestedIds.some(id => !variantById.has(id))) {
    throw Object.assign(new Error('Variant not found'), { status: 404 });
  }

  // An option hidden after the picker loaded is skipped rather than failing the request.
  const activeVariants = productVariants.filter(v => v.isActive);
  const requestedActive = requestedIds.filter(id => variantById.get(id)!.isActive);
  const anchor = requestedActive.length > 0 ? variantById.get(requestedActive[0])! : null;
  if (!anchor) {
    throw Object.assign(new Error('Variant not found'), { status: 404 });
  }

  const group = getGroupOptions(product, anchor, activeVariants);
  const groupIds = new Set(group.map(v => v.id));
  if (requestedActive.some(id => !groupIds.has(id))) {
    throw Object.assign(new Error('Selected options must belong to the same group'), { status: 422 });
  }
  if (!group.some(v => v.stock > 0)) {
    throw Object.assign(new Error('All options in this group are out of stock'), { status: 422 });
  }

  const ordered = activeVariants.filter(v => groupIds.has(v.id)).map(v => v.id);
  return { variantId: ordered[0], variantIds: ordered };
}

export async function createBoost(
  sellerId: string,
  productId: string,
  input: CreateBoostInput,
): Promise<ProductBoost> {
  const product = await Product.findOne({
    where: { id: productId, sellerId },
    include: [{ model: Category, attributes: ['id', 'attributeSchema'] }],
  });
  if (!product) {
    throw Object.assign(new Error('Product not found'), { status: 404 });
  }

  const { variantId, variantIds } = await resolvePromotedOptions(product, input);

  await ProductBoost.update(
    { status: 'cancelled', paymentStatus: 'cancelled' },
    { where: { sellerId, productId, status: 'pending' } },
  );

  const existing = await ProductBoost.findOne({ where: { productId, status: 'active' } });
  if (existing) {
    throw Object.assign(new Error('This product already has an active boost'), { status: 409 });
  }

  const audienceType = AUDIENCE_TYPE_BY_CODE[input.type];
  const { min, max } = estimateImpressions(input.budget);

  const receipt = `boost_${productId}_${Date.now()}`;
  let order;
  try {
    order = await createRazorpayOrder(input.budget, receipt);
  } catch (err) {
    throw Object.assign(err as Error, { status: 502 });
  }

  return ProductBoost.create({
    sellerId,
    productId,
    productName: product.name,
    variantId,
    variantIds,
    audienceType,
    state: audienceType === 'state' || audienceType === 'city' ? input.state : null,
    city: audienceType === 'city' ? input.city : null,
    dailyBudget: input.budget,
    estimatedImpressionsMin: min,
    estimatedImpressionsMax: max,
    status: 'pending',
    razorpayOrderId: order.orderId,
    paymentStatus: 'pending',
    amount: input.budget,
    currency: order.currency,
  });
}

export async function getActiveBoost(sellerId: string, productId: string): Promise<ProductBoost | null> {
  return ProductBoost.findOne({
    where: { sellerId, productId, status: { [Op.in]: ['active', 'pending'] } },
    order: [[literal(`status = 'active'`), 'DESC'], ['createdAt', 'DESC']],
    include: [{ model: ProductVariant, attributes: ['id', 'attributes', 'isActive', 'images'] }],
  });
}

export async function markBoostPaid(razorpayOrderId: string, paymentId: string, signature: string): Promise<void> {
  const boost = await ProductBoost.findOne({ where: { razorpayOrderId }, include: [{ model: Product }] });
  if (!boost || boost.paymentStatus === 'paid') return;

  const otherActivePaid = boost.productId === null ? 0 : await ProductBoost.count({
    where: {
      productId: boost.productId,
      status: 'active',
      paymentStatus: 'paid',
      id: { [Op.ne]: boost.id },
    },
  });

  // A boost cancelled before payment landed (superseded, product hidden/deleted, or its
  // options all hidden) must not go live — record the payment for a refund instead.
  const refundReason = boost.status === 'cancelled'
    ? 'was cancelled before payment completed'
    : otherActivePaid > 0 ? 'was paid while the product already has a live paid boost' : null;

  if (refundReason) {
    console.error(
      `markBoostPaid: boost ${boost.id} (product ${boost.productId ?? 'deleted'}, order ${razorpayOrderId}, ` +
        `payment ${paymentId}) ${refundReason} — needs a refund`,
    );
    await boost.update({ paymentStatus: 'paid', razorpayPaymentId: paymentId, razorpaySignature: signature });
    return;
  }

  await boost.update({
    status: 'active',
    paymentStatus: 'paid',
    razorpayPaymentId: paymentId,
    razorpaySignature: signature,
  });

  const seller = await User.findByPk(boost.sellerId, {
    include: [{ model: SellerProfile, attributes: ['email', 'businessName'] }],
  });
  const email = seller?.sellerProfile?.email ?? seller?.email;
  if (email) {
    try {
      await sendBoostPaymentConfirmedEmail(
        email,
        seller?.sellerProfile?.businessName ?? seller?.fullName ?? 'there',
        boost.product?.name ?? boost.productName ?? 'your product',
        boost.amount,
      );
    } catch (err) {
      console.error('markBoostPaid: failed to send confirmation email', err);
    }
  }
}

export async function markBoostFailed(razorpayOrderId: string, paymentId: string): Promise<void> {
  const boost = await ProductBoost.findOne({ where: { razorpayOrderId }, include: [{ model: Product }] });
  if (!boost || boost.paymentStatus !== 'pending') return;
  await boost.update({ paymentStatus: 'failed', status: 'cancelled', razorpayPaymentId: paymentId });

  const seller = await User.findByPk(boost.sellerId, {
    include: [{ model: SellerProfile, attributes: ['email', 'businessName'] }],
  });
  const email = seller?.sellerProfile?.email ?? seller?.email;
  if (email) {
    try {
      await sendBoostPaymentFailedEmail(
        email,
        seller?.sellerProfile?.businessName ?? seller?.fullName ?? 'there',
        boost.product?.name ?? boost.productName ?? 'your product',
        boost.amount,
      );
    } catch (err) {
      console.error('markBoostFailed: failed to send failure email', err);
    }
  }
}

export async function cancelBoost(sellerId: string, productId: string): Promise<void> {
  const boost = await ProductBoost.findOne({
    where: { sellerId, productId, status: 'pending' },
    order: [['createdAt', 'DESC']],
  });
  if (!boost) return;
  await boost.update({ paymentStatus: 'cancelled', status: 'cancelled' });
}

export interface BoostPaymentRow {
  id: string;
  productId: string | null;
  variantId: string | null;
  variantIds: string[] | null;
  productName: string;
  productImage: string | null;
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

export async function getBoosts(
  sellerId: string,
  page: number,
  limit: number,
  paymentStatus?: PaymentStatus,
): Promise<{ rows: BoostPaymentRow[]; count: number }> {
  const where: Record<string, unknown> = { sellerId };
  if (paymentStatus) where.paymentStatus = paymentStatus;

  const { rows, count } = await ProductBoost.findAndCountAll({
    where,
    include: [
      { model: Product, attributes: ['name', 'images'], required: false },
      { model: ProductVariant, attributes: ['images'], required: false },
    ],
    order: [['createdAt', 'DESC']],
    limit,
    offset: (page - 1) * limit,
  });

  const signed = await Promise.all(
    rows.map(async (boost): Promise<BoostPaymentRow> => {
      const json = boost.toJSON() as ProductBoost & {
        product?: { name?: string; images?: string[] };
        variant?: { images?: string[] } | null;
      };
      const firstKey = json.variant?.images?.[0] ?? json.product?.images?.[0] ?? null;
      const productImage = firstKey ? await getPresignedUrl(firstKey) : null;
      return {
        id:              json.id,
        productId:       json.productId,
        variantId:       json.variantId,
        variantIds:      boost.variantIds,
        productName:     json.product?.name ?? json.productName ?? 'Product',
        productImage,
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
