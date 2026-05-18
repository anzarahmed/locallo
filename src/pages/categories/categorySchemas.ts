import * as Yup from 'yup';

export const categorySchema = Yup.object({
  name:      Yup.string().trim().max(100, 'Max 100 characters').required('Name is required'),
  slug:      Yup.string()
    .trim()
    .max(100, 'Max 100 characters')
    .matches(/^[a-z0-9-]+$/, 'Lowercase letters, numbers and hyphens only')
    .required('Slug is required'),
  sortOrder: Yup.number().integer().min(0, 'Must be 0 or higher').default(0),
});

export type CategoryFormValues = Yup.InferType<typeof categorySchema>;
