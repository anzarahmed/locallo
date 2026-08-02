import * as Yup from 'yup';

export const createCmsPageSchema = Yup.object({
  title:   Yup.string().trim().max(200).required('Title is required'),
  slug:    Yup.string().trim().max(150).matches(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers and hyphens').required('Slug is required'),
  content: Yup.string().trim().required('Content is required'),
});

export const updateCmsPageSchema = Yup.object({
  title:    Yup.string().trim().max(200),
  slug:     Yup.string().trim().max(150).matches(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers and hyphens'),
  content:  Yup.string().trim(),
  isActive: Yup.boolean(),
});
