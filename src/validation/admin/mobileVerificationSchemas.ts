import * as Yup from 'yup';

export const requestMobileOtpSchema = Yup.object({
  countryCode: Yup.string().required('Country code is required'),
  mobile: Yup.string()
    .matches(/^[0-9]{7,15}$/, 'Invalid mobile number')
    .required('Mobile is required'),
});

export const verifyMobileOtpSchema = Yup.object({
  countryCode: Yup.string().required('Country code is required'),
  mobile: Yup.string()
    .matches(/^[0-9]{7,15}$/, 'Invalid mobile number')
    .required('Mobile is required'),
  otp: Yup.string().length(4, 'OTP must be 4 digits').required('OTP is required'),
});
