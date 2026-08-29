import * as Yup from 'yup';

function trimIfString(_value: unknown, originalValue: unknown): unknown {
  return typeof originalValue === 'string' ? originalValue.trim() : originalValue;
}

export const searchProductsSchema = Yup.object({
  page: Yup.number().integer().min(1).default(1),
  limit: Yup.number().integer().min(1).max(50).default(20),
  searchQuery: Yup.string().transform(trimIfString).default(''),
  searchByLocation: Yup.object({
    lat: Yup.number().min(-90).max(90).required('lat is required'),
    lng: Yup.number().min(-180).max(180).required('lng is required'),
  }).default(undefined),
  category_id: Yup.number()
    .integer()
    .transform((value, originalValue) => (originalValue === '' ? undefined : value)),
  brand_id: Yup.number()
    .integer()
    .transform((value, originalValue) => (originalValue === '' ? undefined : value)),
  shop_id: Yup.string()
    .uuid()
    .transform((value, originalValue) => (originalValue === '' ? undefined : value)),
  offer_id: Yup.number()
    .integer()
    .transform((value, originalValue) => (originalValue === '' ? undefined : value)),
  state: Yup.string().transform(trimIfString),
  city: Yup.string().transform(trimIfString),
});

export const trendingQuerySchema = Yup.object({
  state: Yup.string().transform(trimIfString),
  city: Yup.string().transform(trimIfString),
});
