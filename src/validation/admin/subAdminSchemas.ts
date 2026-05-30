import * as Yup from 'yup';

export const createSubAdminSchema = Yup.object({
  email: Yup.string().email('Invalid email').required('Email is required'),
  password: Yup.string().min(8, 'Password must be at least 8 characters').required('Password is required'),
  fullName: Yup.string().nullable().default(null),
  role: Yup.string().oneOf(['manager', 'operator'], 'Role must be manager or operator').required('Role is required'),
});

export const updateSubAdminSchema = Yup.object({
  email: Yup.string().email('Invalid email').required('Email is required'),
  password: Yup.string().min(8, 'Password must be at least 8 characters').nullable().default(null),
  fullName: Yup.string().nullable().default(null),
  role: Yup.string().oneOf(['manager', 'operator'], 'Role must be manager or operator').required('Role is required'),
});
