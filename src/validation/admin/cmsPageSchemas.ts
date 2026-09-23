import * as Yup from 'yup';
import type { CmsAudience } from '../../types';
import { CMS_AUDIENCES } from '../../utils/cmsAudience';

export const createCmsPageSchema = Yup.object({
  title:    Yup.string().trim().max(200).required('Title is required'),
  slug:     Yup.string().trim().max(150).matches(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers and hyphens').required('Slug is required'),
  content:  Yup.string().trim().required('Content is required'),
  audience: Yup.mixed<CmsAudience>().oneOf(CMS_AUDIENCES, 'Audience must be customer or seller'),
});

export const updateCmsPageSchema = Yup.object({
  title:    Yup.string().trim().max(200),
  slug:     Yup.string().trim().max(150).matches(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers and hyphens'),
  content:  Yup.string().trim(),
  isActive: Yup.boolean(),
  audience: Yup.mixed<CmsAudience>().oneOf(CMS_AUDIENCES, 'Audience must be customer or seller'),
});
