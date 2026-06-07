export const PATHS = {
  AUTH: {
    REQUEST_OTP: '/api/sellers/auth/request-otp',
    VERIFY_OTP:  '/api/sellers/auth/verify-otp',
    LOGOUT:      '/api/sellers/auth/logout',
  },
  PROFILE:    '/api/sellers/profile',
  ADDRESS:    '/api/sellers/address',
  PRODUCTS:       '/api/sellers/products',
  UPLOAD_IMAGE:   '/api/sellers/products/images',
  ANALYZE_IMAGE:  '/api/sellers/products/analyze-image',
  CATEGORIES:     '/api/sellers/categories',
  SETTINGS:       '/api/sellers/settings',
} as const;
