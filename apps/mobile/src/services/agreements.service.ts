import { api } from './api';
import type {
  AgreementListItem,
  AgreementsListResponse,
  AgreementDetail,
  CreateSimpleAgreementPayload,
  CreateGuaranteedAgreementPayload,
  PaymentIntentResponse,
  OpenDisputePayload,
  DisputeDetail,
  AgreementProof,
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

  getById: (id: string) => api.get<AgreementDetail>(`/agreements/${id}`),

  createSimple: (payload: CreateSimpleAgreementPayload) =>
    api.post<AgreementDetail>('/agreements/simple', payload),

  createGuaranteed: (payload: CreateGuaranteedAgreementPayload) =>
    api.post<AgreementDetail>('/agreements/guaranteed', payload),

  accept: (id: string) => api.post<AgreementListItem>(`/agreements/${id}/accept`, {}),

  decline: (id: string) => api.post<AgreementListItem>(`/agreements/${id}/decline`, {}),

  cancel: (id: string) => api.post<AgreementListItem>(`/agreements/${id}/cancel`, {}),

  complete: (id: string) => api.post<AgreementListItem>(`/agreements/${id}/complete`, {}),

  confirmCompletion: (id: string) =>
    api.post<AgreementListItem>(`/agreements/${id}/confirm-completion`, {}),

  createPaymentIntent: (id: string) =>
    api.post<PaymentIntentResponse>(`/agreements/${id}/payment-intents`, {}),

  openDispute: (id: string, payload: OpenDisputePayload) =>
    api.post<AgreementDetail>(`/agreements/${id}/dispute`, payload),

  getDispute: (id: string) => api.get<DisputeDetail>(`/agreements/${id}/dispute`),

  getProofs: (id: string) => api.get<AgreementProof[]>(`/agreements/${id}/proofs`),
};
