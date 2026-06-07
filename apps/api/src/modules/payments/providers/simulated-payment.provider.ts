import { Injectable } from '@nestjs/common';
import { ReceivingKeyType } from '@prisma/client';
import { randomUUID } from 'crypto';
import {
  CreatePixChargeParams,
  IPaymentProvider,
  PixChargeData,
  PixWebhookEvent,
} from './payment-provider.interface';

@Injectable()
export class SimulatedPaymentProvider implements IPaymentProvider {
  readonly providerName = 'SIMULATED';

  createPixCharge(params: CreatePixChargeParams): PixChargeData {
    const { agreementId, amount } = params;
    const txid = randomUUID().replace(/-/g, '').slice(0, 35);
    const pixKey = 'SELO-PLATFORM@DEV.LOCAL';
    const qrCode = [
      '00020126360014br.gov.bcb.pix0114SELO-PLATFORM',
      `@DEV52040000530398654${String(amount).padStart(10, '0')}`,
      '5802BR5913SELO PLATFORM6009SAO PAULO63044A1B',
    ].join('');

    return {
      txid,
      pixKey,
      pixKeyType: ReceivingKeyType.RANDOM,
      qrCode,
      rawRequest: { simulated: true, agreementId },
      rawResponse: { txid, status: 'ACTIVE' },
      instructions:
        'Ambiente de desenvolvimento: copie o código Pix e use o botão de simulação para confirmar o pagamento.',
      providerName: this.providerName,
    };
  }

  validateWebhookSignature(
    _secret: string | undefined,
    _headers: Record<string, string>,
    _rawBody: string,
  ): boolean {
    return true;
  }

  parseWebhookPayload(body: Record<string, unknown>): PixWebhookEvent {
    const event = body['event'] as string | undefined;
    return {
      eventType: event === 'PIX_PAYMENT_CONFIRMED' ? 'PIX_CONFIRMED' : 'UNKNOWN',
      txid: (body['txid'] as string) ?? null,
      amount: (body['amount'] as string) ?? null,
      endToEndId: (body['endToEndId'] as string) ?? null,
    };
  }
}
