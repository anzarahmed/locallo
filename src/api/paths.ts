export const PATHS = {
  AUTH: {
    LOGIN: '/api/admins/login',
  },
  SELLERS: {
    CREATE: '/api/admins/sellers',
    LIST:   '/api/admins/sellers',
    BY_ID:    (id: string) => `/api/admins/sellers/${id}`,
    STATUS:   (id: string) => `/api/admins/sellers/${id}/status`,
  },
} as const;
