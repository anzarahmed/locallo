import * as Yup from 'yup';
import type { Seller } from '../../types';

export const sellerSchema = Yup.object({
  name: Yup.string().trim().required('Full name is required'),
  email: Yup.string().trim().email('Enter a valid email').required('Email is required'),
  phone: Yup.string()
    .trim()
    .matches(/^\+?[0-9\s\-()]{7,15}$/, 'Enter a valid phone number')
    .required('Phone number is required'),
  businessName: Yup.string().trim().required('Business name is required'),
  status: Yup.mixed<Seller['status']>()
    .oneOf(['active', 'inactive', 'pending'])
    .required(),
  latitude: Yup.number()
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90')
    .required('Location is required — pin the seller on the map'),
  longitude: Yup.number()
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180')
    .required('Location is required — pin the seller on the map'),
});

export type SellerFormValues = Yup.InferType<typeof sellerSchema>;
