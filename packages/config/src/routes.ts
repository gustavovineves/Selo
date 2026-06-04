export const API_PREFIX = '/api/v1';

export const ROUTES = {
  AUTH: {
    REGISTER: '/auth/register',
    LOGIN: '/auth/login',
    REFRESH: '/auth/refresh',
    ME: '/auth/me',
    LOGOUT: '/auth/logout',
  },
  USERS: {
    BASE: '/users',
    BY_ID: '/users/:id',
  },
  PROFILES: {
    BASE: '/profiles',
    BY_USER: '/profiles/:userId',
  },
  RECEIVING_KEYS: {
    BASE: '/receiving-keys',
    BY_ID: '/receiving-keys/:id',
  },
  RECEIVING_DESTINATIONS: {
    BASE: '/receiving-destinations',
    BY_ID: '/receiving-destinations/:id',
  },
  AGREEMENTS: {
    BASE: '/agreements',
    BY_ID: '/agreements/:id',
    EVENTS: '/agreements/:id/events',
    ACCEPT: '/agreements/:id/accept',
    COMPLETE: '/agreements/:id/complete',
    CANCEL: '/agreements/:id/cancel',
  },
  PAYMENTS: {
    BASE: '/payments',
    BY_ID: '/payments/:id',
  },
  DISPUTES: {
    BASE: '/disputes',
    BY_ID: '/disputes/:id',
  },
  NOTIFICATIONS: {
    BASE: '/notifications',
    READ: '/notifications/:id/read',
  },
} as const;
