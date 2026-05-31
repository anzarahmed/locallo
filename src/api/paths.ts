export const PATHS = {
  AUTH: {
    REQUEST_OTP: '/api/sellers/auth/request-otp',
    VERIFY_OTP:  '/api/sellers/auth/verify-otp',
    LOGOUT:      '/api/sellers/auth/logout',
  },
  PROFILE:    '/api/sellers/profile',
  ADDRESS:    '/api/sellers/address',
  PRODUCTS:   '/api/sellers/products',
  CATEGORIES: '/api/sellers/categories',
} as const;
