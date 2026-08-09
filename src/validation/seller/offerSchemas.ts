import * as Yup from 'yup';

export const acceptOfferSchema = Yup.object({
  productIds: Yup.array().of(Yup.string().required()).required('productIds is required'),
});
