import * as Yup from 'yup';
import type { AttributeField } from '../../types';

export const categorySchema = Yup.object({
  name: Yup.string().trim().max(100, 'Max 100 characters').required('Name is required'),
  slug: Yup.string()
    .trim()
    .max(100, 'Max 100 characters')
    .matches(/^[a-z0-9-]+$/, 'Lowercase letters, numbers and hyphens only')
    .required('Slug is required'),
});

export type CategoryFormValues = Yup.InferType<typeof categorySchema> & {
  attributeSchema: AttributeField[];
  icon: string | null;
};
