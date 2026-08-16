import * as Yup from 'yup';
import type { OfferType } from '../../types';

export const OFFER_TYPE_OPTIONS: { value: OfferType; label: string }[] = [
  { value: 'percentage_off', label: 'Percentage Off' },
  { value: 'flat_amount_off', label: 'Flat Amount Off' },
  { value: 'bogo', label: 'BOGO (Buy One Get One)' },
];

export const offerSchema = Yup.object({
  title: Yup.string().trim().required('Title is required'),
  description: Yup.string().trim().nullable(),
  startDate: Yup.string()
    .required('Start date/time is required')
    .test('is-future', 'Start date must be after today', value => {
      if (!value) return true;
      const startOfTomorrow = new Date();
      startOfTomorrow.setHours(24, 0, 0, 0);
      return new Date(value).getTime() >= startOfTomorrow.getTime();
    }),
  endDate: Yup.string()
    .required('End date/time is required')
    .test('after-start', 'End date must be after start date', function (value) {
      const { startDate } = this.parent as { startDate?: string };
      if (!startDate || !value) return true;
      return value > startDate;
    }),
  offerType: Yup.string().oneOf(['percentage_off', 'flat_amount_off', 'bogo']).required('Offer type is required'),

  discountPercent: Yup.number().typeError('Enter a valid number').when('offerType', {
    is: 'percentage_off',
    then: s => s.required('Discount % is required').min(1, 'Must be at least 1').max(100, 'Must be at most 100'),
    otherwise: s => s.optional(),
  }),
  maxDiscountCap: Yup.number().typeError('Enter a valid number').when('offerType', {
    is: 'percentage_off',
    then: s => s.positive('Must be a positive number').optional(),
    otherwise: s => s.optional(),
  }),
  flatAmount: Yup.number().typeError('Enter a valid number').when('offerType', {
    is: 'flat_amount_off',
    then: s => s.required('Flat amount is required').positive('Must be a positive number'),
    otherwise: s => s.optional(),
  }),
  buyQty: Yup.number().typeError('Enter a whole number').when('offerType', {
    is: 'bogo',
    then: s => s.required('Buy quantity is required').integer('Must be a whole number').positive('Must be positive'),
    otherwise: s => s.optional(),
  }),
  getQty: Yup.number().typeError('Enter a whole number').when('offerType', {
    is: 'bogo',
    then: s => s.required('Get quantity is required').integer('Must be a whole number').positive('Must be positive'),
    otherwise: s => s.optional(),
  }),
  getDiscountPercent: Yup.number().typeError('Enter a valid number').when('offerType', {
    is: 'bogo',
    then: s => s.required('Get discount % is required').min(1, 'Must be at least 1').max(100, 'Must be at most 100'),
    otherwise: s => s.optional(),
  }),
});

export type OfferFormValues = Yup.InferType<typeof offerSchema>;
