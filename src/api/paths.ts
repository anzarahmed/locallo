export const PATHS = {
  CMS_PAGE: (slug: string): string => `/api/customers/cms-pages/${slug}`,
  FAQS: '/api/customers/faqs',
} as const;
