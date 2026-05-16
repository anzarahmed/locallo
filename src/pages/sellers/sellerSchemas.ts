import * as Yup from 'yup';

export const DAYS = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
] as const;
export type Day = typeof DAYS[number];

export const SHOP_CATEGORIES = [
  'Grocery',
  'Restaurant & Food',
  'Electronics',
  'Fashion & Clothing',
  'Pharmacy',
  'Beauty & Personal Care',
  'Home & Kitchen',
  'Sports & Fitness',
  'Books & Stationery',
  'Other',
] as const;

export const COUNTRY_CODES = [
  { code: '+91',  label: '+91 (India)'     },
  { code: '+1',   label: '+1 (US/Canada)'  },
  { code: '+44',  label: '+44 (UK)'        },
  { code: '+971', label: '+971 (UAE)'      },
  { code: '+61',  label: '+61 (Australia)' },
  { code: '+65',  label: '+65 (Singapore)' },
  { code: '+60',  label: '+60 (Malaysia)'  },
] as const;

const daySchema = Yup.object({
  isClosed: Yup.boolean().required(),
  open: Yup.string()
    .when('isClosed', {
      is: false,
      then: (s) => s.required('Opening time is required'),
    })
    .default(''),
  close: Yup.string()
    .when('isClosed', {
      is: false,
      then: (s) => s.required('Closing time is required'),
    })
    .default(''),
});

export const sellerSchema = Yup.object({
  shopName:    Yup.string().trim().required('Shop name is required'),
  ownerName:   Yup.string().trim().required('Owner name is required'),
  email:       Yup.string().trim().email('Enter a valid email').required('Email is required'),
  countryCode: Yup.string().required('Country code is required'),
  mobile:      Yup.string()
    .trim()
    .matches(/^[0-9]{7,15}$/, 'Digits only, 7–15 characters')
    .required('Mobile number is required'),
  category: Yup.string().required('Category is required'),
  bio:      Yup.string().trim().max(500, 'Bio must be under 500 characters').default(''),
  workingHours: Yup.object({
    monday:    daySchema,
    tuesday:   daySchema,
    wednesday: daySchema,
    thursday:  daySchema,
    friday:    daySchema,
    saturday:  daySchema,
    sunday:    daySchema,
  }).required(),
  latitude:  Yup.number().min(-90).max(90).required('Location is required — pin the seller on the map'),
  longitude: Yup.number().min(-180).max(180).required('Location is required — pin the seller on the map'),
});

export type SellerFormValues = Yup.InferType<typeof sellerSchema>;

const openDay = { isClosed: false, open: '09:00', close: '18:00' };

export const DEFAULT_WORKING_HOURS: SellerFormValues['workingHours'] = {
  monday:    { ...openDay },
  tuesday:   { ...openDay },
  wednesday: { ...openDay },
  thursday:  { ...openDay },
  friday:    { ...openDay },
  saturday:  { ...openDay },
  sunday:    { isClosed: true, open: '', close: '' },
};
