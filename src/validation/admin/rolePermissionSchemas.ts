import * as Yup from 'yup';

const MODULES = ['sellers', 'categories', 'masterCategories', 'products', 'customers', 'brands', 'banners', 'faqs', 'cmsPages', 'offers'] as const;
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
