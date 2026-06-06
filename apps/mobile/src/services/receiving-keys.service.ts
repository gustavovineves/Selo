import { api } from './api';
import type { ReceivingKeyResponse, ResolveKeyResponse } from '../types/api';

export const receivingKeysService = {
  getMe: () => api.get<ReceivingKeyResponse>('/receiving-keys/me'),

  create: (key: string) => api.post<ReceivingKeyResponse>('/receiving-keys', { key }),

  deleteMe: () =>
    api.delete<{ id: string; key: string; normalizedKey: string; status: string; deletedAt: string }>(
      '/receiving-keys/me',
    ),

  check: (key: string) =>
    api.get<{ available: boolean; reason?: string }>(`/receiving-keys/check/${key}`),

  resolve: (key: string) => {
    const normalized = key.startsWith('@') ? key.slice(1) : key;
    return api.get<ResolveKeyResponse>(`/receiving-keys/resolve/${normalized}`);
  },
};
