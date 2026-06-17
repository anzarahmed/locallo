export const PATHS = {
  AUTH: {
    REQUEST_OTP: '/api/sellers/auth/request-otp',
    VERIFY_OTP:  '/api/sellers/auth/verify-otp',
    LOGOUT:      '/api/sellers/auth/logout',
  },
  DASHBOARD: {
    STATS: '/api/sellers/dashboard/stats',
  },
  PROFILE:    '/api/sellers/profile',
  ADDRESS:    '/api/sellers/address',
  PRODUCTS:       '/api/sellers/products',
  UPLOAD_IMAGE:   '/api/sellers/products/images',
  ANALYZE_IMAGE:  '/api/sellers/products/analyze-image',
  CATEGORIES:     '/api/sellers/categories',
  SETTINGS:       '/api/sellers/settings',
  CUSTOM_DAY:     '/api/sellers/custom-day',
  SOLD_LOGS:      '/api/sellers/sold-logs',
  PRODUCT_SELL:   (id: string): string => `/api/sellers/products/${id}/sell`,
  VARIANT_SELL:   (id: string, vid: string): string => `/api/sellers/products/${id}/variants/${vid}/sell`,
} as const;
