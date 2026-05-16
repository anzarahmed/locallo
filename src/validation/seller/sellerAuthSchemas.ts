import * as Yup from 'yup';

export const requestOtpSchema = Yup.object({
  countryCode: Yup.string().required('Country code is required'),
  phoneNumber: Yup.string().required('Phone number is required'),
  deviceId: Yup.string().required('Device ID is required'),
  deviceType: Yup.string().oneOf(['android', 'ios', 'web'], 'Invalid device type').required('Device type is required'),
});

export const verifyOtpSchema = Yup.object({
  countryCode: Yup.string().required('Country code is required'),
  phoneNumber: Yup.string().required('Phone number is required'),
  otp: Yup.string().length(6, 'OTP must be 6 digits').required('OTP is required'),
  deviceId: Yup.string().required('Device ID is required'),
  deviceType: Yup.string().oneOf(['android', 'ios', 'web'], 'Invalid device type').required('Device type is required'),
});
