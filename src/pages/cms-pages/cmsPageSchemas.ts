import * as Yup from 'yup';
import type { CmsAudience } from '../../types';

export const cmsPageSchema = Yup.object({
  title: Yup.string().trim().max(200, 'Max 200 characters').required('Title is required'),
  slug: Yup.string()
    .trim()
    .max(150, 'Max 150 characters')
    .matches(/^[a-z0-9-]+$/, 'Lowercase letters, numbers and hyphens only')
    .required('Slug is required'),
  content: Yup.string().trim().required('Content is required'),
  audience: Yup.mixed<CmsAudience>().oneOf(['customer', 'seller']).required('Audience is required'),
});

export type CmsPageFormValues = Yup.InferType<typeof cmsPageSchema>;

export interface CmsAudienceOption {
  value: CmsAudience;
  label: string;
}

export const CMS_AUDIENCE_OPTIONS: CmsAudienceOption[] = [
  { value: 'customer', label: 'Customer' },
  { value: 'seller',   label: 'Seller' },
];
