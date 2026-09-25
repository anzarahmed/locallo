import * as Yup from 'yup';

export const createBoostSchema = Yup.object({
  type: Yup.number()
    .oneOf([0, 1, 2], 'Invalid audience type')
    .required('Audience type is required'),
  state: Yup.string().when('type', {
    is: (val: number) => val === 1 || val === 2,
    then: (schema) => schema.required('State is required'),
    otherwise: (schema) => schema.strip(),
  }),
  city: Yup.string().when('type', {
    is: 2,
    then: (schema) => schema.required('City is required'),
    otherwise: (schema) => schema.strip(),
  }),
  budget: Yup.number()
    .integer('Must be a whole number')
    .min(100, 'Minimum daily budget is ₹100')
    .max(5000, 'Daily budget cannot exceed ₹5000')
    .required('Daily budget is required'),
  variantId: Yup.string().uuid('Invalid variant').nullable().notRequired(),
});
