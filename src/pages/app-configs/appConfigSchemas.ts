import * as Yup from 'yup';

const platformConfigSchema = Yup.object({
  version_code: Yup.number()
    .typeError('Version code must be a number')
    .integer('Version code must be a whole number')
    .min(1, 'Version code must be at least 1')
    .required('Version code is required'),
  is_force_update:    Yup.boolean().required(),
  is_app_maintanance: Yup.boolean().required(),
});

export const appConfigSchema = Yup.object({
  android: platformConfigSchema,
  ios:     platformConfigSchema,
});

export type AppConfigFormValues = Yup.InferType<typeof appConfigSchema>;
