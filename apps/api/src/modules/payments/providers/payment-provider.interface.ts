import { ReceivingKeyType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export const PAYMENT_PROVIDER_TOKEN = 'PAYMENT_PROVIDER';

export interface CreatePixChargeParams {
  paymentIntentId: string;
  agreementId: string;
  amount: Decimal;
  currency: string;
  expiresAt: Date;
}

export interface PixChargeData {
  txid: string;
  pixKey: string;
  pixKeyType: ReceivingKeyType;
  qrCode: string;
  rawRequest: Record<string, unknown>;
  rawResponse: Record<string, unknown>;
  instructions: string;
  providerName: string;
}

export interface PixWebhookEvent {
  eventType: 'PIX_CONFIRMED' | 'PIX_FAILED' | 'PIX_EXPIRED' | 'UNKNOWN';
  txid: string | null;
  amount: string | null;
  endToEndId: string | null;
}

export interface IPaymentProvider {
  readonly providerName: string;
  createPixCharge(params: CreatePixChargeParams): PixChargeData;
  validateWebhookSignature(
    secret: string | undefined,
    headers: Record<string, string>,
    rawBody: string,
  ): boolean;
  parseWebhookPayload(body: Record<string, unknown>): PixWebhookEvent;
}
