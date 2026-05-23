import * as Yup from 'yup';

export const adminLoginSchema = Yup.object({
  email: Yup.string().email('Invalid email').required('Email is required'),
  password: Yup.string().required('Password is required'),
});

export const forgotPasswordSchema = Yup.object({
  email: Yup.string().email('Invalid email').required('Email is required'),
});

export const resetPasswordSchema = Yup.object({
  token: Yup.string().required('Token is required'),
  password: Yup.string()
    .min(8, 'Password must be at least 8 characters')
    .matches(/[A-Z]/, 'Must contain at least one uppercase letter')
    .matches(/[0-9]/, 'Must contain at least one number')
    .required('Password is required'),
});
