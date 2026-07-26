import * as Yup from 'yup';

export const createBannerSchema = Yup.object({
  brandId: Yup.number().integer().positive().required('Brand is required'),
  image: Yup.string().required('Image is required'),
  title: Yup.string().max(150).nullable().optional(),
  startDate: Yup.date().required('Start date is required'),
  endDate: Yup.date()
    .required('End date is required')
    .min(Yup.ref('startDate'), 'End date must be on or after start date'),
});

export const updateBannerSchema = Yup.object({
  brandId: Yup.number().integer().positive(),
  image: Yup.string(),
  title: Yup.string().max(150).nullable().optional(),
  startDate: Yup.date(),
  endDate: Yup.date(),
  isActive: Yup.boolean(),
});
