import * as Yup from 'yup';

export const createCategorySchema = Yup.object({
  name:      Yup.string().max(100).required('Name is required'),
  slug:      Yup.string().max(100).matches(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers and hyphens').required('Slug is required'),
  sortOrder: Yup.number().integer().min(0).default(0),
});

export const updateCategorySchema = Yup.object({
  name:      Yup.string().max(100),
  slug:      Yup.string().max(100).matches(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers and hyphens'),
  isActive:  Yup.boolean(),
  sortOrder: Yup.number().integer().min(0),
});
