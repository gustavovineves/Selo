import { api } from './api';
import type { ReceivingKeyResponse, ResolveKeyResponse } from '../types/api';

export const receivingKeysService = {
  getMe: () => api.get<ReceivingKeyResponse>('/receiving-keys/me'),

  create: (key: string) => api.post<ReceivingKeyResponse>('/receiving-keys', { key }),

  check: (key: string) =>
    api.get<{ available: boolean; key: string }>(`/receiving-keys/check/${key}`),

  resolve: (key: string) => {
    const normalized = key.startsWith('@') ? key.slice(1) : key;
    return api.get<ResolveKeyResponse>(`/receiving-keys/resolve/${normalized}`);
  },
};
