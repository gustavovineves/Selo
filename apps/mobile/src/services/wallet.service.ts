import { api } from './api';
import type { WalletSummary } from '../types/api';

export const walletService = {
  getSummary: () => api.get<WalletSummary>('/agreements/summary'),
};
