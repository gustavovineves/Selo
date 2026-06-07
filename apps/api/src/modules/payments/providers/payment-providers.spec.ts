import { Decimal } from '@prisma/client/runtime/library';
import { SimulatedPaymentProvider } from './simulated-payment.provider';
import { FitbankSandboxPaymentProvider } from './fitbank-sandbox-payment.provider';
import { CreatePixChargeParams } from './payment-provider.interface';

const BASE_PARAMS: CreatePixChargeParams = {
  paymentIntentId: 'pi-test-001',
  agreementId: 'agr-test-001',
  amount: new Decimal('350.00'),
  currency: 'BRL',
  expiresAt: new Date('2027-01-01T12:00:00Z'),
};

describe('SimulatedPaymentProvider', () => {
  let provider: SimulatedPaymentProvider;

  beforeEach(() => {
    provider = new SimulatedPaymentProvider();
  });

  it('tem providerName SIMULATED', () => {
    expect(provider.providerName).toBe('SIMULATED');
  });

  it('cria PixCharge com campos obrigatórios preenchidos', () => {
    const result = provider.createPixCharge(BASE_PARAMS);

    expect(result.txid).toBeTruthy();
    expect(result.pixKey).toBe('SELO-PLATFORM@DEV.LOCAL');
    expect(result.pixKeyType).toBe('RANDOM');
    expect(result.qrCode).toBeTruthy();
    expect(result.instructions).toBeTruthy();
    expect(result.providerName).toBe('SIMULATED');
  });

  it('gera txids únicos em chamadas diferentes', () => {
    const r1 = provider.createPixCharge(BASE_PARAMS);
    const r2 = provider.createPixCharge(BASE_PARAMS);
    expect(r1.txid).not.toBe(r2.txid);
  });

  it('valida assinatura de webhook sempre como válida (ambiente simulado)', () => {
    expect(provider.validateWebhookSignature(undefined, {}, '{}')).toBe(true);
    expect(provider.validateWebhookSignature('qualquer-secret', {}, '{}')).toBe(true);
  });

  it('parseWebhookPayload identifica PIX_PAYMENT_CONFIRMED', () => {
    const result = provider.parseWebhookPayload({
      event: 'PIX_PAYMENT_CONFIRMED',
      txid: 'abc123',
      amount: '100.00',
    });

    expect(result.eventType).toBe('PIX_CONFIRMED');
    expect(result.txid).toBe('abc123');
    expect(result.amount).toBe('100.00');
  });

  it('parseWebhookPayload retorna UNKNOWN para evento desconhecido', () => {
    const result = provider.parseWebhookPayload({ event: 'SOME_OTHER_EVENT', txid: 'x' });
    expect(result.eventType).toBe('UNKNOWN');
  });
});

describe('FitbankSandboxPaymentProvider', () => {
  let provider: FitbankSandboxPaymentProvider;

  beforeEach(() => {
    provider = new FitbankSandboxPaymentProvider();
  });

  it('tem providerName FITBANK_SANDBOX', () => {
    expect(provider.providerName).toBe('FITBANK_SANDBOX');
  });

  it('cria PixCharge com txid no formato sandbox', () => {
    const result = provider.createPixCharge(BASE_PARAMS);

    expect(result.txid).toMatch(/^SBXSELO/);
    expect(result.qrCode).toBeTruthy();
    expect(result.rawResponse).toHaveProperty('sandbox', true);
    expect(result.providerName).toBe('FITBANK_SANDBOX');
    expect(result.instructions).toContain('Sandbox');
  });

  it('gera txids únicos em chamadas diferentes', () => {
    const r1 = provider.createPixCharge(BASE_PARAMS);
    const r2 = provider.createPixCharge(BASE_PARAMS);
    expect(r1.txid).not.toBe(r2.txid);
  });

  it('valida assinatura: aceita todos os webhooks quando secret não está configurado', () => {
    expect(provider.validateWebhookSignature(undefined, {}, '{}')).toBe(true);
  });

  it('valida assinatura: rejeita webhook sem header de assinatura quando secret existe', () => {
    const secret = 'meu-secret-sandbox';
    const result = provider.validateWebhookSignature(secret, {}, '{}');
    expect(result).toBe(false);
  });

  it('valida assinatura: aceita webhook com HMAC-SHA256 correto', () => {
    const { createHmac } = require('crypto');
    const secret = 'meu-secret-sandbox';
    const rawBody = '{"event":"PIX_PAYMENT_CONFIRMED","txid":"abc"}';
    const sig = createHmac('sha256', secret).update(rawBody).digest('hex');

    const result = provider.validateWebhookSignature(
      secret,
      { 'x-fitbank-signature': sig },
      rawBody,
    );
    expect(result).toBe(true);
  });

  it('valida assinatura: rejeita webhook com HMAC incorreto', () => {
    const result = provider.validateWebhookSignature(
      'secret',
      { 'x-fitbank-signature': 'assinatura-errada' },
      '{}',
    );
    expect(result).toBe(false);
  });

  it('parseWebhookPayload: identifica PIX_PAYMENT_CONFIRMED', () => {
    const result = provider.parseWebhookPayload({
      event: 'PIX_PAYMENT_CONFIRMED',
      txid: 'sbxtxid001',
    });
    expect(result.eventType).toBe('PIX_CONFIRMED');
    expect(result.txid).toBe('sbxtxid001');
  });

  it('parseWebhookPayload: identifica PIX_RECEIVED', () => {
    const result = provider.parseWebhookPayload({ event: 'PIX_RECEIVED', txid: 'x' });
    expect(result.eventType).toBe('PIX_CONFIRMED');
  });

  it('parseWebhookPayload: identifica PIX_PAYMENT_FAILED', () => {
    const result = provider.parseWebhookPayload({ event: 'PIX_PAYMENT_FAILED', txid: 'x' });
    expect(result.eventType).toBe('PIX_FAILED');
  });

  it('parseWebhookPayload: identifica PIX_EXPIRED', () => {
    const result = provider.parseWebhookPayload({ event: 'PIX_EXPIRED', txid: 'x' });
    expect(result.eventType).toBe('PIX_EXPIRED');
  });

  it('parseWebhookPayload: retorna UNKNOWN para evento desconhecido', () => {
    const result = provider.parseWebhookPayload({ event: 'DESCONHECIDO' });
    expect(result.eventType).toBe('UNKNOWN');
  });
});
