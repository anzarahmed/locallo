import type { InferType } from 'yup';
import { Review } from '../../models/Review';
import { Product } from '../../models/Product';
import { normalizeImageKey } from '../../utils/imageStorage';
import type { createReviewSchema } from '../../validation/customer/reviewSchemas';

type CreateReviewInput = InferType<typeof createReviewSchema>;

export async function createReview(customerId: string, data: CreateReviewInput): Promise<Review> {
  const product = await Product.findOne({ where: { id: data.productId, isActive: true } });
  if (!product) {
    throw Object.assign(new Error('Product not found'), { status: 404 });
  }

  const existing = await Review.findOne({ where: { customerId, productId: data.productId } });
  if (existing) {
    throw Object.assign(new Error('You have already reviewed this product'), { status: 409 });
  }

  return Review.create({
    customerId,
    productId: data.productId,
    rating: data.rating,
    content: data.content,
    images: (data.image ?? []).map(normalizeImageKey),
  });
}
