import * as Yup from 'yup';

export const DAYS = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
] as const;
export type Day = typeof DAYS[number];

const daySchema = Yup.object({
  isClosed: Yup.boolean().required(),
  open: Yup.string()
    .when('isClosed', { is: false, then: (s) => s.required('Opening time required') })
    .default(''),
  close: Yup.string()
    .when('isClosed', { is: false, then: (s) => s.required('Closing time required') })
    .default(''),
});

const openDay = { isClosed: false, open: '09:00', close: '18:00' };

export const DEFAULT_WORKING_HOURS: Record<Day, { isClosed: boolean; open: string; close: string }> = {
  monday:    { ...openDay },
  tuesday:   { ...openDay },
  wednesday: { ...openDay },
  thursday:  { ...openDay },
  friday:    { ...openDay },
  saturday:  { ...openDay },
  sunday:    { isClosed: true, open: '', close: '' },
};

export const profileSchema = Yup.object({
  businessName: Yup.string().required('Shop name is required'),
  fullName:     Yup.string().default(''),
  email:        Yup.string().email('Invalid email').default(''),
  bio:          Yup.string().default(''),
  workingHours: Yup.object({
    monday:    daySchema,
    tuesday:   daySchema,
    wednesday: daySchema,
    thursday:  daySchema,
    friday:    daySchema,
    saturday:  daySchema,
    sunday:    daySchema,
  }).required(),
});

export type ProfileFormValues = Yup.InferType<typeof profileSchema>;

export const addressSchema = Yup.object({
  address: Yup.string().required('Address is required'),
  lat:     Yup.number().required(),
  long:    Yup.number().required(),
});

export type AddressFormValues = Yup.InferType<typeof addressSchema>;
