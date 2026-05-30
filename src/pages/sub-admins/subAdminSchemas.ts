import * as Yup from 'yup';

export const createSubAdminSchema = Yup.object({
  email: Yup.string().email('Invalid email').required('Email is required'),
  password: Yup.string().min(8, 'At least 8 characters').required('Password is required'),
  fullName: Yup.string().nullable().default(null),
  role: Yup.string()
    .oneOf(['manager', 'operator'] as const, 'Select a role')
    .required('Role is required'),
});

export const editSubAdminSchema = Yup.object({
  email: Yup.string().email('Invalid email').required('Email is required'),
  password: Yup.string().min(8, 'At least 8 characters').nullable().default(null),
  fullName: Yup.string().nullable().default(null),
  role: Yup.string()
    .oneOf(['manager', 'operator'] as const, 'Select a role')
    .required('Role is required'),
});

export type CreateSubAdminValues = Yup.InferType<typeof createSubAdminSchema>;
export type EditSubAdminValues = Yup.InferType<typeof editSubAdminSchema>;
