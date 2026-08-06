import * as Yup from 'yup';

export const createReviewSchema = Yup.object({
  productId: Yup.string().uuid().required('productId is required'),
  rating: Yup.number().integer().min(1).max(5).required('rating is required'),
  content: Yup.string().trim().required('content is required'),
  image: Yup.array().of(Yup.string().required()).default([]),
});
