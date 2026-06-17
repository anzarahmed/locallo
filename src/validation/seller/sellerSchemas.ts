import * as Yup from 'yup';

export const setCustomDaySchema = Yup.object({
  date: Yup.string()
    .required('Date is required')
    .matches(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  time: Yup.object({
    isClosed: Yup.boolean().required(),
    open: Yup.string()
      .when('isClosed', { is: false, then: (s) => s.required('Opening time required') })
      .default(''),
    close: Yup.string()
      .when('isClosed', { is: false, then: (s) => s.required('Closing time required') })
      .test('close-after-open', 'Close time must be after open time', function (close) {
        const { isClosed, open } = this.parent as { isClosed: boolean; open: string };
        if (isClosed || !open || !close) return true;
        return close > open;
      })
      .default(''),
  }).required(),
});

export const updateNotificationSettingsSchema = Yup.object({
  pushNotifications:    Yup.boolean().required(),
  emailUpdates:         Yup.boolean().required(),
  smsAlerts:            Yup.boolean().required(),
  offersAndPromotions:  Yup.boolean().required(),
  wishlistPriceDrops:   Yup.boolean().required(),
  sellerUpdates:        Yup.boolean().required(),
});

const dayScheduleSchema = Yup.object({
  isClosed: Yup.boolean().required(),
  open: Yup.string().ensure(),
  close: Yup.string().ensure()
});

export const updateAddressSchema = Yup.object({
  address: Yup.string().required('Address is required'),
  lat: Yup.number().min(-90).max(90).required('Latitude is required'),
  long: Yup.number().min(-180).max(180).required('Longitude is required'),
});

export const updateSellerSchema = Yup.object({
  businessName: Yup.string(),
  email: Yup.string().email('Invalid email'),
  fullName: Yup.string(),
  categoryIds: Yup.array().of(Yup.number().integer().positive()),
  bio: Yup.string(),
  workingHours: Yup.object().shape({
    monday: dayScheduleSchema.required(),
    tuesday: dayScheduleSchema.required(),
    wednesday: dayScheduleSchema.required(),
    thursday: dayScheduleSchema.required(),
    friday: dayScheduleSchema.required(),
    saturday: dayScheduleSchema.required(),
    sunday: dayScheduleSchema.required()
  }).nullable().default(null)
});

export const adminUpdateSellerSchema = Yup.object({
  mobile:       Yup.string().required('Mobile number is required'),
  countryCode:  Yup.string().required('Country code is required'),
  fullName:     Yup.string().required('Owner name is required'),
  businessName: Yup.string().required('Business name is required'),
  email:        Yup.string().email('Invalid email').required('Email is required'),
  categoryIds:  Yup.array().of(Yup.number().integer().positive()).min(1, 'At least one category is required').required('Category is required'),
  bio:          Yup.string().default(''),
  lat:          Yup.number().min(-90).max(90).required('Latitude is required'),
  long:         Yup.number().min(-180).max(180).required('Longitude is required'),
  address:      Yup.string().default(''),
  workingHours: Yup.object().shape({
    monday:    dayScheduleSchema.required(),
    tuesday:   dayScheduleSchema.required(),
    wednesday: dayScheduleSchema.required(),
    thursday:  dayScheduleSchema.required(),
    friday:    dayScheduleSchema.required(),
    saturday:  dayScheduleSchema.required(),
    sunday:    dayScheduleSchema.required(),
  }).nullable().default(null),
});

export const createSellerSchema = Yup.object({
  mobile: Yup.string().required('Mobile number is required'),
  countryCode: Yup.string().default('+91'),
  fullName: Yup.string(),
  businessName: Yup.string().required('Business name is required'),
  email: Yup.string().email('Invalid email').required('Email is required'),
  lat: Yup.number().min(-90).max(90).required('Latitude is required'),
  long: Yup.number().min(-180).max(180).required('Longitude is required'),
  address: Yup.string(),
  city: Yup.string(),
  state: Yup.string(),
  pincode: Yup.string(),
  categoryIds: Yup.array().of(Yup.number().integer().positive()).default([]),
  bio: Yup.string(),
  workingHours: Yup.object().shape({
    monday: dayScheduleSchema.required(),
    tuesday: dayScheduleSchema.required(),
    wednesday: dayScheduleSchema.required(),
    thursday: dayScheduleSchema.required(),
    friday: dayScheduleSchema.required(),
    saturday: dayScheduleSchema.required(),
    sunday: dayScheduleSchema.required()
  }).nullable().default(null)
});
