import * as Yup from 'yup';

export const createBrandSchema = Yup.object({
  name: Yup.string().max(100).required('Name is required'),
  slug: Yup.string().max(100).matches(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers and hyphens').required('Slug is required'),
  logo: Yup.string().nullable().optional(),
});

export const updateBrandSchema = Yup.object({
  name:     Yup.string().max(100),
  slug:     Yup.string().max(100).matches(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers and hyphens'),
  isActive: Yup.boolean(),
  logo:     Yup.string().nullable().optional(),
});
