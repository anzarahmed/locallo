import * as Yup from 'yup';

const MODULES = ['sellers', 'categories', 'products', 'customers', 'brands'] as const;
const ACTIONS = ['list', 'view', 'add', 'edit', 'delete'] as const;

export const updateRolePermissionsSchema = Yup.object({
  permissions: Yup.array()
    .of(
      Yup.object({
        module: Yup.string().oneOf([...MODULES]).required(),
        action: Yup.string().oneOf([...ACTIONS]).required(),
      }),
    )
    .required('permissions is required'),
});
