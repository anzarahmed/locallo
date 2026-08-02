import * as Yup from 'yup';

export const cmsPageSchema = Yup.object({
  title: Yup.string().trim().max(200, 'Max 200 characters').required('Title is required'),
  slug: Yup.string()
    .trim()
    .max(150, 'Max 150 characters')
    .matches(/^[a-z0-9-]+$/, 'Lowercase letters, numbers and hyphens only')
    .required('Slug is required'),
  content: Yup.string().trim().required('Content is required'),
});

export type CmsPageFormValues = Yup.InferType<typeof cmsPageSchema>;
