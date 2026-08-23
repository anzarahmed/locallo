import Razorpay from 'razorpay';
import crypto from 'crypto';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID as string,
  key_secret: process.env.RAZORPAY_KEY_SECRET as string,
});

export async function createRazorpayOrder(
  amountInRupees: number,
  receipt: string,
): Promise<{ orderId: string; amount: number; currency: string }> {
  try {
    const order = await razorpay.orders.create({
      amount: Math.round(amountInRupees * 100),
      currency: 'INR',
      receipt,
    });
    return { orderId: order.id, amount: Number(order.amount) / 100, currency: order.currency };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'unknown error';
    throw new Error(`Razorpay: ${message}`);
  }
}

export function verifyRazorpaySignature(rawBody: Buffer, signature: string): boolean {
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET as string)
    .update(rawBody)
    .digest('hex');
  const expectedBuf = Buffer.from(expected, 'utf8');
  const signatureBuf = Buffer.from(signature, 'utf8');
  return expectedBuf.length === signatureBuf.length && crypto.timingSafeEqual(expectedBuf, signatureBuf);
}
