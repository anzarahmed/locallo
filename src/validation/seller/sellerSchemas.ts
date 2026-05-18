import * as Yup from 'yup';

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
  categoryId: Yup.number().integer().positive(),
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
  categoryId:   Yup.number().integer().positive().required('Category is required'),
  bio:          Yup.string().default(''),
  lat:          Yup.number().min(-90).max(90).required('Latitude is required'),
  long:         Yup.number().min(-180).max(180).required('Longitude is required'),
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
  categoryId: Yup.number().integer().positive(),
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
