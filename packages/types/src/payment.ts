export type PaymentStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
export type PaymentMethod = 'PIX';

export interface Payment {
  id: string;
  agreementId?: string;
  financialGuaranteeId?: string;
  payerId: string;
  method: PaymentMethod;
  amount: number;
  currency: string;
  status: PaymentStatus;
  externalId?: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PixTransaction {
  id: string;
  paymentId: string;
  txid?: string;
  endToEndId?: string;
  pixKey: string;
  pixKeyType: string;
  qrCode?: string;
  qrCodeBase64?: string;
  expiresAt?: string;
  paidAt?: string;
  createdAt: string;
}
