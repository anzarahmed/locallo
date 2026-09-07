import * as Yup from 'yup';

export const requestOtpSchema = Yup.object({
  countryCode: Yup.string().required(),
  phoneNumber: Yup.string()
    .matches(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number')
    .required('Phone number is required'),
});

export type RequestOtpValues = Yup.InferType<typeof requestOtpSchema>;

export const verifyOtpSchema = Yup.object({
  otp: Yup.string()
    .matches(/^\d{4}$/, 'Enter the 4-digit code')
    .required('OTP is required'),
});

export type VerifyOtpValues = Yup.InferType<typeof verifyOtpSchema>;
