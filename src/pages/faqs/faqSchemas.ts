import * as Yup from 'yup';

export const faqSchema = Yup.object({
  question: Yup.string().trim().required('Question is required'),
  answer:   Yup.string().trim().required('Answer is required'),
});

export type FaqFormValues = Yup.InferType<typeof faqSchema>;
