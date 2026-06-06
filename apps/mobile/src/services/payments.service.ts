import { api } from './api';
import type { SimulateConfirmationResponse } from '../types/api';

export const paymentsService = {
  simulateConfirmation: (paymentIntentId: string) =>
    api.post<SimulateConfirmationResponse>(
      `/payments/${paymentIntentId}/simulate-confirmation`,
      {},
    ),
};
