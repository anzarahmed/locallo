import * as Yup from 'yup';

const OFFER_TYPES = ['percentage_off', 'flat_amount_off', 'bogo'] as const;

function isNotInPast(value: Date | undefined): boolean {
  if (!value) return true;
  const startOfCurrentMinute = new Date();
  startOfCurrentMinute.setSeconds(0, 0);
  return value.getTime() >= startOfCurrentMinute.getTime();
}

export const createOfferSchema = Yup.object({
  title: Yup.string().trim().required('Title is required'),
  description: Yup.string().trim().nullable().optional(),
  startDate: Yup.date()
    .required('Start date is required')
    .test('not-in-past', 'Start date cannot be in the past', isNotInPast),
  endDate: Yup.date()
    .required('End date is required')
    .min(Yup.ref('startDate'), 'End date must be after start date'),
  offerType: Yup.string().oneOf(OFFER_TYPES).required('Offer type is required'),
  config: Yup.object().required('Offer configuration is required').unknown(true),
});

export const updateOfferSchema = Yup.object({
  title: Yup.string().trim(),
  description: Yup.string().trim().nullable().optional(),
  startDate: Yup.date().test('not-in-past', 'Start date cannot be in the past', isNotInPast),
  endDate: Yup.date(),
  offerType: Yup.string().oneOf(OFFER_TYPES),
  config: Yup.object().unknown(true),
  isActive: Yup.boolean(),
});
