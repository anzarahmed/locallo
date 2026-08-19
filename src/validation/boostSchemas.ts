import * as Yup from 'yup';
import { MIN_DAILY_BUDGET, MAX_DAILY_BUDGET } from '../constants';
import type { BoostAudienceType } from '../types';

export const boostSchema = Yup.object({
  audienceType: Yup.string()
    .oneOf(['pan_india', 'state', 'city'], 'Please choose an audience')
    .required('Please choose an audience'),
  state: Yup.string().when('audienceType', {
    is: (val: string) => val === 'state' || val === 'city',
    then: (schema) => schema.required('Please select a state'),
    otherwise: (schema) => schema.notRequired(),
  }),
  city: Yup.string().when('audienceType', {
    is: 'city',
    then: (schema) => schema.required('Please select a city'),
    otherwise: (schema) => schema.notRequired(),
  }),
  dailyBudget: Yup.number()
    .typeError('Enter a valid amount')
    .integer('Must be a whole number')
    .min(MIN_DAILY_BUDGET, `Minimum daily budget is ₹${MIN_DAILY_BUDGET}`)
    .max(MAX_DAILY_BUDGET, `Maximum daily budget is ₹${MAX_DAILY_BUDGET}`)
    .required('Daily budget is required'),
});

export interface BoostFormValues {
  audienceType: BoostAudienceType | '';
  state: string;
  city: string;
  dailyBudget: string;
}
