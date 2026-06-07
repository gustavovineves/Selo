import { api } from './api';

export type FeedbackCategory = 'BUG' | 'SUGGESTION' | 'QUESTION' | 'GENERAL';

export interface FeedbackPayload {
  category: FeedbackCategory;
  message: string;
  context?: string;
}

export const feedbackService = {
  submit: (payload: FeedbackPayload) =>
    api.post<{ received: boolean }>('/feedback', payload),
};
