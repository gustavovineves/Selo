import * as SecureStore from 'expo-secure-store';
import { api } from './api';
import type { AuthMeResponse, AuthTokenResponse } from '../types/api';

interface LoginPayload {
  email: string;
  password: string;
}

interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName?: string;
  phone?: string;
}

export const authService = {
  async login(payload: LoginPayload): Promise<AuthTokenResponse> {
    const res = await api.post<AuthTokenResponse>('/auth/login', payload);
    await SecureStore.setItemAsync('accessToken', res.accessToken);
    await SecureStore.setItemAsync('refreshToken', res.refreshToken);
    return res;
  },

  async register(payload: RegisterPayload): Promise<AuthTokenResponse> {
    const res = await api.post<AuthTokenResponse>('/auth/register', payload);
    await SecureStore.setItemAsync('accessToken', res.accessToken);
    await SecureStore.setItemAsync('refreshToken', res.refreshToken);
    return res;
  },

  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout', {});
    } catch {
      // ignora erro de rede no logout
    }
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
  },

  getMe: () => api.get<AuthMeResponse>('/auth/me'),

  async getStoredToken(): Promise<string | null> {
    return SecureStore.getItemAsync('accessToken');
  },
};
