import * as Yup from 'yup';

export const registerPushTokenSchema = Yup.object({
  token: Yup.string().trim().min(20, 'Invalid push token').max(4096, 'Invalid push token').required('Push token is required'),
});
