import { api } from './api';
import type { ReceivingKeyResponse } from '../types/api';

export const receivingKeysService = {
  getMe: () => api.get<ReceivingKeyResponse>('/receiving-keys/me'),

  create: (key: string) => api.post<ReceivingKeyResponse>('/receiving-keys', { key }),

  check: (key: string) =>
    api.get<{ available: boolean; key: string }>(`/receiving-keys/check/${key}`),
};
