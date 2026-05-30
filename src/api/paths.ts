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
  },
  CATEGORIES: {
    LIST:   '/api/admins/categories',
    BY_ID:  (id: number) => `/api/admins/categories/${id}`,
  },
  PRODUCTS: {
    LIST:   '/api/admins/products',
    BY_ID:  (id: string) => `/api/admins/products/${id}`,
    TOGGLE: (id: string) => `/api/admins/products/${id}/toggle`,
  },
  MOBILE_VERIFY: {
    REQUEST: '/api/admins/mobile/request-otp',
    VERIFY:  '/api/admins/mobile/verify-otp',
  },
} as const;
