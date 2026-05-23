import * as Yup from 'yup';

const attributeFieldOptionSchema = Yup.object({
  label: Yup.string().required(),
  value: Yup.string().required(),
  hex:   Yup.string().optional(),
});

const attributeFieldSchema = Yup.object({
  key:      Yup.string().required(),
  label:    Yup.string().required(),
  type:     Yup.string().oneOf(['text', 'textarea', 'number', 'select', 'multiselect', 'color']).required(),
  required: Yup.boolean().required(),
  unit:     Yup.string().optional(),
  options:  Yup.array(attributeFieldOptionSchema).optional(),
});

export const createCategorySchema = Yup.object({
  name: Yup.string().max(100).required('Name is required'),
  slug: Yup.string().max(100).matches(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers and hyphens').required('Slug is required'),
});

export const updateCategorySchema = Yup.object({
  name:            Yup.string().max(100),
  slug:            Yup.string().max(100).matches(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers and hyphens'),
  isActive:        Yup.boolean(),
  attributeSchema: Yup.array(attributeFieldSchema).optional(),
});
