import * as Yup from 'yup';

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
});
