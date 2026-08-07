import type { InferType } from 'yup';
import { QueryTypes } from 'sequelize';
import { Review } from '../../models/Review';
import { Product } from '../../models/Product';
import { User } from '../../models/User';
import { normalizeImageKey } from '../../utils/imageStorage';
import sequelize from '../../config/database';
import type { createReviewSchema } from '../../validation/customer/reviewSchemas';

type CreateReviewInput = InferType<typeof createReviewSchema>;

const MAX_MEDIA_IMAGES = 50;

export async function createReview(customerId: string, data: CreateReviewInput): Promise<Review> {
  const product = await Product.findOne({ where: { id: data.productId, isActive: true } });
  if (!product) {
    throw Object.assign(new Error('Product not found'), { status: 404 });
  }

  const existing = await Review.findOne({ where: { customerId, productId: data.productId } });
  if (existing) {
   // throw Object.assign(new Error('You have already reviewed this product'), { status: 409 });
  }

  return Review.create({
    customerId,
    productId: data.productId,
    rating: data.rating,
    content: data.content,
    images: (data.image ?? []).map(normalizeImageKey),
  });
}

export async function listReviews(
  productId: string,
  page: number,
  limit: number,
): Promise<{ rows: Review[]; count: number; media: string[] }> {
  const product = await Product.findOne({ where: { id: productId, isActive: true } });
  if (!product) {
    throw Object.assign(new Error('Product not found'), { status: 404 });
  }

  const { rows, count } = await Review.findAndCountAll({
    where: { productId },
    include: [{ model: User, as: 'customer', attributes: ['id', 'fullName', 'profileImage'] }],
    order: [['createdAt', 'DESC']],
    limit,
    offset: (page - 1) * limit,
  });

  const mediaRows = await sequelize.query<{ img: string }>(
    `SELECT img FROM reviews r, LATERAL jsonb_array_elements_text(r.images) AS img
     WHERE r.product_id = :productId
     ORDER BY r.created_at DESC
     LIMIT :maxMedia`,
    { replacements: { productId, maxMedia: MAX_MEDIA_IMAGES }, type: QueryTypes.SELECT },
  );

  return { rows, count, media: mediaRows.map((r) => r.img) };
}

export async function deleteReview(customerId: string, reviewId: string): Promise<void> {
  const review = await Review.findOne({ where: { id: reviewId, customerId } });
  if (!review) {
    throw Object.assign(new Error('Review not found'), { status: 404 });
  }

  await review.destroy();
}
