import { api } from './api';
import type {
  AuthMeResponse,
  FinancialProfileResponse,
  UpdateFinancialProfilePayload,
} from '../types/api';

export interface UpdateProfilePayload {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  bio?: string;
}

export const usersService = {
  updateProfile: (payload: UpdateProfilePayload) =>
    api.patch<AuthMeResponse>('/users/me/profile', payload),

  getFinancialProfile: () =>
    api.get<FinancialProfileResponse>('/users/me/financial-profile'),

  updateFinancialProfile: (payload: UpdateFinancialProfilePayload) =>
    api.patch<FinancialProfileResponse>('/users/me/financial-profile', payload),

  submitFinancialProfile: () =>
    api.post<FinancialProfileResponse>('/users/me/financial-profile/submit', {}),

  simulateApproval: () =>
    api.post<FinancialProfileResponse>('/users/me/financial-profile/simulate-approval', {}),

  simulateRejection: (reason?: string) =>
    api.post<FinancialProfileResponse>('/users/me/financial-profile/simulate-rejection', { reason }),
};
