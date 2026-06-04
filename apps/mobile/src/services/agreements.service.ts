import { api } from './api';
import type { Agreement } from '@selo/types';

export const agreementsService = {
  list: (params?: { status?: string; page?: number }) =>
    api.get<{ data: Agreement[]; total: number }>(`/agreements?${new URLSearchParams(params as Record<string, string>)}`),

  getById: (id: string) => api.get<Agreement>(`/agreements/${id}`),

  create: (payload: Partial<Agreement>) => api.post<Agreement>('/agreements', payload),

  accept: (id: string) => api.patch(`/agreements/${id}/accept`, {}),

  complete: (id: string) => api.patch(`/agreements/${id}/complete`, {}),

  cancel: (id: string) => api.patch(`/agreements/${id}/cancel`, {}),
};
