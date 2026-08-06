import type { Request, Response } from 'express';
import { sendSuccess, handleServiceError } from '../../utils/response';
import { signImages } from '../../utils/imageStorage';
import * as reviewService from '../../services/customer/reviewService';

interface ReviewItem {
  id: string;
  productId: string;
  rating: number;
  content: string;
  images: string[];
  createdAt: Date;
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
