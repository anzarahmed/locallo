import * as Yup from 'yup';

export const bannerSchema = Yup.object({
  brandId: Yup.number().integer().positive().required('Brand is required'),
  title: Yup.string().trim().max(150, 'Max 150 characters').nullable(),
  startDate: Yup.string().required('Start date is required'),
  endDate: Yup.string()
    .required('End date is required')
    .test('after-start', 'End date must be on or after start date', function (value) {
      const { startDate } = this.parent as { startDate?: string };
      if (!startDate || !value) return true;
      return value >= startDate;
    }),
});

export type BannerFormValues = Yup.InferType<typeof bannerSchema> & {
  image: string;
};
