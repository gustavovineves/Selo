import { api } from './api';
import type {
  AgreementListItem,
  AgreementsListResponse,
} from '../types/api';

export interface ListAgreementsParams {
  status?: string;
  financialStatus?: string;
  myRole?: 'creator' | 'counterpart' | 'payer' | 'receiver';
  pendingMyAction?: boolean;
  hasGuarantee?: boolean;
  inDispute?: boolean;
  dueBefore?: string;
  dueAfter?: string;
  page?: number;
  limit?: number;
}

export const agreementsService = {
  list: (params?: ListAgreementsParams) => {
    const qs = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          qs.set(key, String(value));
        }
      });
    }
    const query = qs.toString();
    return api.get<AgreementsListResponse>(`/agreements${query ? `?${query}` : ''}`);
  },

  getById: (id: string) => api.get<AgreementListItem>(`/agreements/${id}`),

  accept: (id: string) => api.post<AgreementListItem>(`/agreements/${id}/accept`, {}),

  decline: (id: string) => api.post<AgreementListItem>(`/agreements/${id}/decline`, {}),

  cancel: (id: string) => api.post<AgreementListItem>(`/agreements/${id}/cancel`, {}),

  complete: (id: string) => api.post<AgreementListItem>(`/agreements/${id}/complete`, {}),

  confirmCompletion: (id: string) =>
    api.post<AgreementListItem>(`/agreements/${id}/confirm-completion`, {}),
};
