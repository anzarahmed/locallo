import * as Yup from 'yup';

export const createReviewSchema = Yup.object({
  productId: Yup.string().uuid().required('productId is required'),
  rating: Yup.number().integer().min(1).max(5).required('rating is required'),
  content: Yup.string().trim().required('content is required'),
  image: Yup.array().of(Yup.string().required()).default([]),
});

export const reviewIdSchema = Yup.string().uuid('Invalid review id').required('Review id is required');

export const updateReviewSchema = Yup.object({
  rating: Yup.number().integer().min(1).max(5),
  content: Yup.string().trim().min(1, 'content cannot be empty'),
  image: Yup.array().of(Yup.string().required()),
}).test(
  'at-least-one-field',
  'Provide at least one of rating, content or image',
  (value) => value.rating !== undefined || value.content !== undefined || value.image !== undefined,
);
