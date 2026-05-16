import * as Yup from 'yup';

const dayScheduleSchema = Yup.object({
  isClosed: Yup.boolean().required(),
  open: Yup.string().ensure(),
  close: Yup.string().ensure()
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
  category: Yup.string(),
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
