import { api } from './api';
import type { AuthMeResponse } from '../types/api';

export interface UpdateProfilePayload {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  bio?: string;
}

export const usersService = {
  updateProfile: (payload: UpdateProfilePayload) =>
    api.patch<AuthMeResponse>('/users/me/profile', payload),
};
