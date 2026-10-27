import * as Yup from 'yup';
import type { AttributeField } from '../../types';

export const categorySchema = Yup.object({
  masterCategoryId: Yup.number().integer().positive().required('Master Category is required'),
  name: Yup.string().trim().max(100, 'Max 100 characters').required('Name is required'),
  slug: Yup.string()
    .trim()
    .max(100, 'Max 100 characters')
    .matches(/^[a-z0-9-]+$/, 'Lowercase letters, numbers and hyphens only')
    .required('Slug is required'),
  productLimit: Yup.string()
    .trim()
    .required('Product listing limit is required')
    .matches(/^\d+$/, 'Enter a whole number')
    .max(9, 'Limit is too large'),
});

export type CategoryFormValues = Omit<Yup.InferType<typeof categorySchema>, 'masterCategoryId' | 'productLimit'> & {
  productLimit: string;
  masterCategoryId: number | '';
  attributeSchema: AttributeField[];
  icon: string | null;
};
