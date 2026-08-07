import type { Request, Response } from 'express';
import { sendSuccess, sendError, handleServiceError } from '../../utils/response';
import { signImages, getPresignedUrlOrNull, saveReviewImage } from '../../utils/imageStorage';
import { parsePagination } from '../../utils/pagination';
import * as reviewService from '../../services/customer/reviewService';

interface ReviewItem {
  id: string;
  productId: string;
  rating: number;
  content: string;
  images: string[];
  createdAt: Date;
}

interface ReviewCustomer {
  id: string | null;
  name: string;
  image: string | null;
}

interface ReviewListItem {
  id: string;
  customer: ReviewCustomer;
  rating: number;
  review: string;
  image: string[];
}

export async function uploadReviewImages(req: Request, res: Response): Promise<void> {
  const files = req.files as Express.Multer.File[] | undefined;
  if (!files || files.length === 0) {
    sendError(res, 'No image files provided', 400);
    return;
  }
  try {
    const keys = await Promise.all(files.map((file) => saveReviewImage(file, req.customer!.id)));
    const images = await signImages(keys);
    sendSuccess(res, { images }, 'Images uploaded', 201);
  } catch (err: unknown) {
    handleServiceError(err, res, 'Failed to upload images');
  }
}

export async function addReview(req: Request, res: Response): Promise<void> {
  try {
    const review = await reviewService.createReview(req.customer!.id, req.body);
    const item: ReviewItem = {
      id: review.id,
      productId: review.productId,
      rating: review.rating,
      content: review.content,
      images: await signImages(review.images),
      createdAt: review.createdAt,
    };
    sendSuccess(res, item, 'Review added', 201);
  } catch (err: unknown) {
    handleServiceError(err, res, 'Failed to add review');
  }
}

export async function getReviews(req: Request, res: Response): Promise<void> {
  const productId = String(req.query.productId ?? '');
  if (!productId) {
    sendError(res, 'productId is required', 400);
    return;
  }

  const { page, limit } = parsePagination(req);

  try {
    const { rows, count, media } = await reviewService.listReviews(productId, page, limit);

    const review: ReviewListItem[] = await Promise.all(
      rows.map(async (r) => ({
        id: r.id,
        customer: {
          id: r.customer?.id ?? null,
          name: r.customer?.fullName ?? 'Customer',
          image: await getPresignedUrlOrNull(r.customer?.profileImage),
        },
        rating: r.rating,
        review: r.content,
        image: await signImages(r.images),
      })),
    );

    sendSuccess(
      res,
      { media: await signImages(media), review, total: count, page, limit },
      'Reviews fetched',
    );
  } catch (err: unknown) {
    handleServiceError(err, res, 'Failed to fetch reviews');
  }
}

export async function removeReview(req: Request, res: Response): Promise<void> {
  try {
    await reviewService.deleteReview(req.customer!.id, String(req.params.id));
    sendSuccess(res, null, 'Review deleted');
  } catch (err: unknown) {
    handleServiceError(err, res, 'Failed to delete review');
  }
}
