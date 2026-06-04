import * as SecureStore from 'expo-secure-store';
import { api } from './api';

interface LoginPayload { email: string; password: string; }
interface RegisterPayload { email: string; password: string; fullName: string; phone?: string; }
interface AuthResponse { accessToken: string; refreshToken: string; userId?: string; }

export const authService = {
  async login(payload: LoginPayload): Promise<AuthResponse> {
    const res = await api.post<AuthResponse>('/auth/login', payload);
    await SecureStore.setItemAsync('accessToken', res.accessToken);
    await SecureStore.setItemAsync('refreshToken', res.refreshToken);
    return res;
  },

  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const res = await api.post<AuthResponse>('/auth/register', payload);
    await SecureStore.setItemAsync('accessToken', res.accessToken);
    await SecureStore.setItemAsync('refreshToken', res.refreshToken);
    return res;
  },

  async logout(): Promise<void> {
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
  },

  async getMe() {
    return api.get('/auth/me');
  },
};
