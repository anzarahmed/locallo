import * as Yup from 'yup';

export const createFaqSchema = Yup.object({
  question: Yup.string().trim().required('Question is required'),
  answer:   Yup.string().trim().required('Answer is required'),
});

export const updateFaqSchema = Yup.object({
  question: Yup.string().trim(),
  answer:   Yup.string().trim(),
  isActive: Yup.boolean(),
});
