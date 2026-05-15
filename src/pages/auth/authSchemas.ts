import * as Yup from 'yup';

export const loginSchema = Yup.object({
  email: Yup.string().trim().email('Enter a valid email address').required('Email is required'),
  password: Yup.string().min(6, 'Password must be at least 6 characters').required('Password is required'),
});

export const forgotSchema = Yup.object({
  email: Yup.string().trim().email('Enter a valid email address').required('Email is required'),
});

export const resetSchema = Yup.object({
  password: Yup.string()
    .min(8, 'Password must be at least 8 characters')
    .matches(/[A-Z]/, 'Must contain at least one uppercase letter')
    .matches(/[0-9]/, 'Must contain at least one number')
    .required('Password is required'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password')], 'Passwords do not match')
    .required('Please confirm your password'),
});

export type LoginValues = Yup.InferType<typeof loginSchema>;
export type ForgotValues = Yup.InferType<typeof forgotSchema>;
export type ResetValues = Yup.InferType<typeof resetSchema>;
