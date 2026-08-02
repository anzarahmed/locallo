export const PATHS = {
  CMS_PAGE: (slug: string): string => `/api/customers/cms-pages/${slug}`,
} as const;
