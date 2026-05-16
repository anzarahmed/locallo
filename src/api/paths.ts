export const PATHS = {
  AUTH: {
    LOGIN: '/api/admins/login',
  },
  SELLERS: {
    CREATE: '/api/sellers',
    LIST:   '/api/sellers',
    BY_ID:  (id: string) => `/api/sellers/${id}`,
  },
} as const;
