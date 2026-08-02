export const PATHS = {
  AUTH: {
    LOGIN:            '/api/admins/login',
    FORGOT_PASSWORD:  '/api/admins/forgot-password',
    RESET_PASSWORD:   '/api/admins/reset-password',
  },
  SELLERS: {
    CREATE: '/api/admins/sellers',
    LIST:   '/api/admins/sellers',
    BY_ID:    (id: string) => `/api/admins/sellers/${id}`,
    STATUS:   (id: string) => `/api/admins/sellers/${id}/status`,
    KYC_DOCUMENTS: (id: string) => `/api/admins/sellers/${id}/kyc/documents`,
    KYC_VERIFY:    (id: string) => `/api/admins/sellers/${id}/kyc/verify`,
    BRANDS:        (id: string) => `/api/admins/sellers/${id}/brands`,
  },
  CATEGORIES: {
    LIST:   '/api/admins/categories',
    BY_ID:  (id: number) => `/api/admins/categories/${id}`,
    ICON:   '/api/admins/categories/icon',
  },
  BRANDS: {
    LIST:   '/api/admins/brands',
    BY_ID:  (id: number) => `/api/admins/brands/${id}`,
    LOGO:   '/api/admins/brands/logo',
  },
  FAQS: {
    LIST:   '/api/admins/faqs',
    BY_ID:  (id: number) => `/api/admins/faqs/${id}`,
  },
  CMS_PAGES: {
    LIST:   '/api/admins/cms-pages',
    BY_ID:  (id: number) => `/api/admins/cms-pages/${id}`,
  },
  BANNERS: {
    LIST:   '/api/admins/banners',
    BY_ID:  (id: number) => `/api/admins/banners/${id}`,
    IMAGE:  '/api/admins/banners/image',
  },
  PRODUCTS: {
    LIST:   '/api/admins/products',
    BY_ID:  (id: string) => `/api/admins/products/${id}`,
    TOGGLE: (id: string) => `/api/admins/products/${id}/toggle`,
  },
  CUSTOMERS: {
    LIST:   '/api/admins/customers',
    BY_ID:  (id: string) => `/api/admins/customers/${id}`,
    STATUS: (id: string) => `/api/admins/customers/${id}/status`,
  },
  MOBILE_VERIFY: {
    REQUEST: '/api/admins/mobile/request-otp',
    VERIFY:  '/api/admins/mobile/verify-otp',
  },
  ME: {
    PERMISSIONS: '/api/admins/me/permissions',
  },
  SUB_ADMINS: {
    LIST:   '/api/admins/sub-admins',
    CREATE: '/api/admins/sub-admins',
    BY_ID:  (id: string) => `/api/admins/sub-admins/${id}`,
    STATUS: (id: string) => `/api/admins/sub-admins/${id}/status`,
  },
  ROLE_PERMISSIONS: {
    BY_ROLE: (role: string) => `/api/admins/roles/${role}/permissions`,
  },
} as const;
