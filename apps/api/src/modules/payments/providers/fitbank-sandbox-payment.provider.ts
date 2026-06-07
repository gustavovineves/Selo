import { Injectable } from '@nestjs/common';
import { ReceivingKeyType } from '@prisma/client';
import { randomUUID, createHmac, timingSafeEqual } from 'crypto';
import {
  CreatePixChargeParams,
  IPaymentProvider,
  PixChargeData,
  PixWebhookEvent,
} from './payment-provider.interface';

const CONFIRMED_EVENTS = new Set([
  'PIX_PAYMENT_CONFIRMED',
  'PIX_RECEIVED',
  'PAYMENT_CONFIRMED',
]);
const FAILED_EVENTS = new Set(['PIX_PAYMENT_FAILED', 'PAYMENT_FAILED']);
const EXPIRED_EVENTS = new Set(['PIX_EXPIRED', 'PAYMENT_EXPIRED']);

@Injectable()
export class FitbankSandboxPaymentProvider implements IPaymentProvider {
  readonly providerName = 'FITBANK_SANDBOX';

  createPixCharge(params: CreatePixChargeParams): PixChargeData {
    const { agreementId, amount } = params;
    const txid = `SBXSELO${randomUUID().replace(/-/g, '').toUpperCase().slice(0, 28)}`;
    const pixKey = process.env['FITBANK_PIX_KEY'] || 'sandbox@fitbank.com.br';
    const amountFormatted = Number(amount).toFixed(2);
    const amountLen = String(amountFormatted.length).padStart(2, '0');
    const suffix = randomUUID().replace(/-/g, '').slice(0, 4).toUpperCase();
    const qrCode = [
      '00020126580014br.gov.bcb.pix013636c4a5c3-sandbox-fitbank-',
      `${txid.slice(0, 14)}52040000530398654${amountLen}${amountFormatted}`,
      `5802BR5924SELO PLATAFORMA SANDBOX6009SAO PAULO6304${suffix}`,
    ].join('');

    return {
      txid,
      pixKey,
      pixKeyType: ReceivingKeyType.RANDOM,
      qrCode,
      rawRequest: {
        sandbox: true,
        provider: 'fitbank',
        agreementId,
        env: process.env['FITBANK_ENV'] || 'sandbox',
        realCallsEnabled: false,
      },
      rawResponse: {
        txid,
        status: 'ACTIVE',
        sandbox: true,
        note: 'Sandbox: nenhuma chamada real ao Fitbank foi realizada.',
      },
      instructions:
        'Ambiente Fitbank Sandbox: copie o código Pix. Para confirmar, envie um webhook para POST /api/v1/payments/webhooks/fitbank ou use POST /payments/:id/simulate-confirmation.',
      providerName: this.providerName,
    };
  }

  validateWebhookSignature(
    secret: string | undefined,
    headers: Record<string, string>,
    rawBody: string,
  ): boolean {
    if (!secret) return true;

    const signature =
      headers['x-fitbank-signature'] || headers['x-webhook-signature'] || '';
    if (!signature) return false;

    const cleanSig = signature.replace(/^sha256=/i, '');
    let sigBuffer: Buffer;
    try {
      sigBuffer = Buffer.from(cleanSig, 'hex');
    } catch {
      return false;
    }

    const expectedSig = createHmac('sha256', secret).update(rawBody).digest('hex');
    const expectedBuffer = Buffer.from(expectedSig, 'hex');

    if (sigBuffer.length !== expectedBuffer.length) return false;
    return timingSafeEqual(sigBuffer, expectedBuffer);
  }

  parseWebhookPayload(body: Record<string, unknown>): PixWebhookEvent {
    const event = body['event'] as string | undefined;

    let eventType: PixWebhookEvent['eventType'] = 'UNKNOWN';
    if (event && CONFIRMED_EVENTS.has(event)) eventType = 'PIX_CONFIRMED';
    else if (event && FAILED_EVENTS.has(event)) eventType = 'PIX_FAILED';
    else if (event && EXPIRED_EVENTS.has(event)) eventType = 'PIX_EXPIRED';

    return {
      eventType,
      txid: (body['txid'] as string) ?? null,
      amount: (body['amount'] as string) ?? null,
      endToEndId: (body['endToEndId'] as string) ?? null,
    };
  }
}
