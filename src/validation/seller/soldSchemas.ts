import * as Yup from 'yup';

export const markSoldSchema = Yup.object({
  quantity: Yup.number()
    .integer('Quantity must be a whole number')
    .min(1, 'Must sell at least 1')
    .required('Quantity is required'),
});
