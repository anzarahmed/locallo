import { Product } from '../../models/Product';
import { ProductBoost } from '../../models/ProductBoost';
import { User } from '../../models/User';
import { SellerProfile } from '../../models/SellerProfile';
import { createRazorpayOrder } from '../../utils/razorpay';
import { sendBoostPaymentConfirmedEmail } from '../../utils/mailer';
import type { BoostAudienceType } from '../../types';

const IMPRESSIONS_PER_RUPEE = 20;

export function estimateImpressions(dailyBudget: number): { min: number; max: number } {
  const max = dailyBudget * IMPRESSIONS_PER_RUPEE;
  const min = max - Math.round(max * 0.005);
  return { min, max };
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
}

export async function createBoost(
  sellerId: string,
  productId: string,
  input: CreateBoostInput,
): Promise<ProductBoost> {
  const product = await Product.findOne({ where: { id: productId, sellerId } });
  if (!product) {
    throw Object.assign(new Error('Product not found'), { status: 404 });
  }

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
    audienceType,
    state: audienceType === 'state' || audienceType === 'city' ? input.state : null,
    city: audienceType === 'city' ? input.city : null,
    dailyBudget: input.budget,
    estimatedImpressionsMin: min,
    estimatedImpressionsMax: max,
    status: 'active',
    razorpayOrderId: order.orderId,
    paymentStatus: 'pending',
    amount: input.budget,
    currency: order.currency,
  });
}

export async function getActiveBoost(sellerId: string, productId: string): Promise<ProductBoost | null> {
  return ProductBoost.findOne({
    where: { sellerId, productId, status: 'active' },
    order: [['createdAt', 'DESC']],
  });
}

export async function markBoostPaid(razorpayOrderId: string, paymentId: string, signature: string): Promise<void> {
  const boost = await ProductBoost.findOne({ where: { razorpayOrderId }, include: [{ model: Product }] });
  if (!boost || boost.paymentStatus === 'paid') return;

  await boost.update({ paymentStatus: 'paid', razorpayPaymentId: paymentId, razorpaySignature: signature });

  const seller = await User.findByPk(boost.sellerId, {
    include: [{ model: SellerProfile, attributes: ['email', 'businessName'] }],
  });
  const email = seller?.sellerProfile?.email ?? seller?.email;
  if (email) {
    try {
      await sendBoostPaymentConfirmedEmail(
        email,
        seller?.sellerProfile?.businessName ?? seller?.fullName ?? 'there',
        boost.product.name,
        boost.amount,
      );
    } catch (err) {
      console.error('markBoostPaid: failed to send confirmation email', err);
    }
  }
}

export async function markBoostFailed(razorpayOrderId: string, paymentId: string): Promise<void> {
  const boost = await ProductBoost.findOne({ where: { razorpayOrderId } });
  if (!boost || boost.paymentStatus !== 'pending') return;
  await boost.update({ paymentStatus: 'failed', status: 'cancelled', razorpayPaymentId: paymentId });
}
