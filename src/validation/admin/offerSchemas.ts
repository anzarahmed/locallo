import * as Yup from 'yup';

const OFFER_TYPES = ['percentage_off', 'flat_amount_off', 'bogo'] as const;

// Epoch-millisecond comparison, so it is correct regardless of the server's or the
// admin's own timezone — "IST" only matters for how the instant is displayed, not for
// this duration check.
const MIN_LEAD_TIME_MS = 3 * 60 * 60 * 1000;
const LEAD_TIME_MESSAGE = 'Start date must be at least 3 hours ahead of the current date and time';

function isAtLeastLeadTimeAhead(value: Date | undefined): boolean {
  if (!value) return true;
  const threshold = new Date();
  threshold.setSeconds(0, 0);
  threshold.setTime(threshold.getTime() + MIN_LEAD_TIME_MS);
  return value.getTime() >= threshold.getTime();
}

export const createOfferSchema = Yup.object({
  title: Yup.string().trim().required('Title is required'),
  description: Yup.string().trim().nullable().optional(),
  startDate: Yup.date()
    .required('Start date is required')
    .test('lead-time', LEAD_TIME_MESSAGE, isAtLeastLeadTimeAhead),
  endDate: Yup.date()
    .required('End date is required')
    .min(Yup.ref('startDate'), 'End date must be after start date'),
  offerType: Yup.string().oneOf(OFFER_TYPES).required('Offer type is required'),
  config: Yup.object().required('Offer configuration is required').unknown(true),
});

export const updateOfferSchema = Yup.object({
  title: Yup.string().trim(),
  description: Yup.string().trim().nullable().optional(),
  startDate: Yup.date().test('lead-time', LEAD_TIME_MESSAGE, isAtLeastLeadTimeAhead),
  endDate: Yup.date(),
  offerType: Yup.string().oneOf(OFFER_TYPES),
  config: Yup.object().unknown(true),
  isActive: Yup.boolean(),
});
