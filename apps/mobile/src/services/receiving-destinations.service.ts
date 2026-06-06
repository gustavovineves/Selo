import { api } from './api';
import type { ReceivingDestinationResponse } from '../types/api';

export const receivingDestinationsService = {
  getMe: () => api.get<ReceivingDestinationResponse[]>('/receiving-destinations/me'),

  create: (payload: { type: string; pixKey: string; label?: string; isDefault?: boolean }) =>
    api.post<ReceivingDestinationResponse>('/receiving-destinations', payload),

  update: (id: string, payload: { label?: string; isDefault?: boolean }) =>
    api.patch<ReceivingDestinationResponse>(`/receiving-destinations/${id}`, payload),

  remove: (id: string) =>
    api.delete<ReceivingDestinationResponse>(`/receiving-destinations/${id}`),
};
