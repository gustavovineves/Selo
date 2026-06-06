import { api } from './api';
import type { DisputeDetail, DisputeMessage, AddEvidencePayload } from '../types/api';

export const disputesService = {
  getById: (disputeId: string) => api.get<DisputeDetail>(`/disputes/${disputeId}`),

  addEvidence: (disputeId: string, payload: AddEvidencePayload) =>
    api.post<DisputeMessage>(`/disputes/${disputeId}/messages`, {
      content: payload.content,
      type: payload.type ?? 'EVIDENCE',
    }),
};
