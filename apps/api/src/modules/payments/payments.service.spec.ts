import { Test } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { TrustScoreService } from '../trust-score/trust-score.service';
import { BlockchainRecordsService } from '../blockchain-records/blockchain-records.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PAYMENT_PROVIDER_TOKEN } from './providers/payment-provider.interface';
import {
  createPrismaMock,
  makePaymentIntent,
  makeGuaranteedAgreement,
  makeFinancialGuarantee,
} from '../../test/helpers/factories';
import { FitbankWebhookDto } from './dto/fitbank-webhook.dto';

const EMPTY_HEADERS: Record<string, string> = {};

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prisma: ReturnType<typeof createPrismaMock>;
  let mockPaymentProvider: {
    providerName: string;
    validateWebhookSignature: jest.Mock;
    parseWebhookPayload: jest.Mock;
    createPixCharge: jest.Mock;
  };

  beforeEach(async () => {
    prisma = createPrismaMock();

    mockPaymentProvider = {
      providerName: 'SIMULATED',
      validateWebhookSignature: jest.fn().mockReturnValue(true),
      parseWebhookPayload: jest.fn().mockReturnValue({
        eventType: 'PIX_CONFIRMED',
        txid: 'test-txid-001',
        amount: '100.00',
        endToEndId: null,
      }),
      createPixCharge: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogsService, useValue: { log: jest.fn().mockResolvedValue({}) } },
        { provide: TrustScoreService, useValue: { recordEvent: jest.fn() } },
        { provide: BlockchainRecordsService, useValue: { createPending: jest.fn() } },
        { provide: NotificationsService, useValue: { send: jest.fn().mockResolvedValue({}) } },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue(undefined) },
        },
        { provide: PAYMENT_PROVIDER_TOKEN, useValue: mockPaymentProvider },
      ],
    }).compile();

    service = module.get(PaymentsService);
  });

  // ── simulateConfirmation ─────────────────────────────────────

  describe('simulateConfirmation', () => {
    const PAYER_ID = 'user-a';
    const PAYMENT_ID = 'pi-001';

    function makeFullPaymentIntent(overrides: Partial<Record<string, unknown>> = {}) {
      return {
        ...makePaymentIntent(overrides),
        agreement: {
          ...makeGuaranteedAgreement(),
          participants: [{ userId: PAYER_ID }, { userId: 'user-b' }],
          financialGuarantee: makeFinancialGuarantee({ status: 'AWAITING_PAYMENT' }),
        },
      };
    }

    it('confirma pagamento simulado e muda guarantee para LOCKED', async () => {
      const pi = makeFullPaymentIntent({ status: 'AWAITING_PAYMENT' });
      prisma.paymentIntent.findUnique.mockResolvedValue(pi);
      prisma.paymentIntent.update.mockResolvedValue({});
      prisma.pixCharge.update.mockResolvedValue({});
      prisma.financialGuarantee.update.mockResolvedValue({});
      prisma.agreement.update.mockResolvedValue({});
      prisma.agreementEvent.createMany.mockResolvedValue({ count: 2 });
      prisma.agreementStatusHistory.create.mockResolvedValue({});

      await service.simulateConfirmation(PAYER_ID, PAYMENT_ID);

      expect(prisma.financialGuarantee.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'LOCKED' }),
        }),
      );
    });

    it('lança NotFoundException para PaymentIntent inexistente', async () => {
      prisma.paymentIntent.findUnique.mockResolvedValue(null);

      await expect(service.simulateConfirmation(PAYER_ID, PAYMENT_ID)).rejects.toThrow(NotFoundException);
    });

    it('lança ForbiddenException para usuário não participante', async () => {
      const pi = makeFullPaymentIntent({ status: 'AWAITING_PAYMENT' });
      prisma.paymentIntent.findUnique.mockResolvedValue(pi);

      await expect(service.simulateConfirmation('user-ghost', PAYMENT_ID)).rejects.toThrow(ForbiddenException);
    });

    it('lança ConflictException se pagamento já foi confirmado', async () => {
      const pi = makeFullPaymentIntent({ status: 'PAID' });
      prisma.paymentIntent.findUnique.mockResolvedValue(pi);

      await expect(service.simulateConfirmation(PAYER_ID, PAYMENT_ID)).rejects.toThrow(ConflictException);
    });

    it('lança BadRequestException para pagamento em estado não confirmável', async () => {
      const pi = makeFullPaymentIntent({ status: 'PENDING' });
      prisma.paymentIntent.findUnique.mockResolvedValue(pi);

      await expect(service.simulateConfirmation(PAYER_ID, PAYMENT_ID)).rejects.toThrow(BadRequestException);
    });

    it('lança BadRequestException quando não há garantia associada', async () => {
      const pi = {
        ...makeFullPaymentIntent({ status: 'AWAITING_PAYMENT' }),
        agreement: {
          ...makeGuaranteedAgreement(),
          participants: [{ userId: PAYER_ID }],
          financialGuarantee: null,
        },
      };
      prisma.paymentIntent.findUnique.mockResolvedValue(pi);

      await expect(service.simulateConfirmation(PAYER_ID, PAYMENT_ID)).rejects.toThrow(BadRequestException);
    });
  });

  // ── handleFitbankWebhook ─────────────────────────────────────

  describe('handleFitbankWebhook', () => {
    const TXID = 'txid-sandbox-001';

    function makePixChargeWithIntent(piOverrides: Partial<Record<string, unknown>> = {}) {
      return {
        id: 'pxc-001',
        txid: TXID,
        status: 'ACTIVE',
        paymentIntentId: 'pi-001',
        paymentIntent: {
          ...makePaymentIntent({ status: 'AWAITING_PAYMENT', ...piOverrides }),
          agreement: {
            ...makeGuaranteedAgreement(),
            participants: [{ userId: 'user-a' }, { userId: 'user-b' }],
            financialGuarantee: makeFinancialGuarantee({ status: 'AWAITING_PAYMENT' }),
          },
        },
      };
    }

    const validWebhookBody: FitbankWebhookDto = {
      event: 'PIX_PAYMENT_CONFIRMED',
      txid: TXID,
      amount: '100.00',
    };

    it('processa webhook PIX_CONFIRMED e protege o valor', async () => {
      prisma.pixCharge.findUnique.mockResolvedValue(makePixChargeWithIntent());
      prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn(prisma));
      prisma.paymentIntent.update.mockResolvedValue({});
      prisma.pixCharge.update.mockResolvedValue({});
      prisma.financialGuarantee.update.mockResolvedValue({});
      prisma.agreement.update.mockResolvedValue({});
      prisma.agreementEvent.create.mockResolvedValue({});
      prisma.agreementStatusHistory.create.mockResolvedValue({});

      const result = await service.handleFitbankWebhook(EMPTY_HEADERS, '{}', validWebhookBody);

      expect(result).toEqual({
        received: true,
        message: 'Pagamento confirmado e valor protegido.',
      });
      expect(prisma.financialGuarantee.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'LOCKED' }),
        }),
      );
    });

    it('é idempotente: webhook duplicado (PaymentIntent já PAID) retorna sem reprocessar', async () => {
      const alreadyPaid = makePixChargeWithIntent({ status: 'PAID' });
      prisma.pixCharge.findUnique.mockResolvedValue(alreadyPaid);

      const result = await service.handleFitbankWebhook(EMPTY_HEADERS, '{}', validWebhookBody);

      expect(result).toEqual(expect.objectContaining({ received: true }));
      expect(prisma.financialGuarantee.update).not.toHaveBeenCalled();
    });

    it('ignora evento não-PIX_CONFIRMED sem processar', async () => {
      mockPaymentProvider.parseWebhookPayload.mockReturnValue({
        eventType: 'UNKNOWN',
        txid: null,
        amount: null,
        endToEndId: null,
      });

      const unknownBody: FitbankWebhookDto = { event: 'PIX_PAYMENT_REFUNDED', txid: TXID };

      const result = await service.handleFitbankWebhook(EMPTY_HEADERS, '{}', unknownBody);

      expect(result.received).toBe(true);
      expect(prisma.pixCharge.findUnique).not.toHaveBeenCalled();
    });

    it('retorna ignorado se PixCharge não encontrado para o txid', async () => {
      prisma.pixCharge.findUnique.mockResolvedValue(null);

      const result = await service.handleFitbankWebhook(EMPTY_HEADERS, '{}', validWebhookBody);

      expect(result.received).toBe(true);
      expect(prisma.financialGuarantee.update).not.toHaveBeenCalled();
    });

    it('lança UnauthorizedException para assinatura inválida', async () => {
      mockPaymentProvider.validateWebhookSignature.mockReturnValue(false);

      await expect(
        service.handleFitbankWebhook(EMPTY_HEADERS, '{}', validWebhookBody),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('lança BadRequestException quando PIX_CONFIRMED sem txid', async () => {
      const bodyWithoutTxid: FitbankWebhookDto = { event: 'PIX_PAYMENT_CONFIRMED' };

      mockPaymentProvider.parseWebhookPayload.mockReturnValue({
        eventType: 'PIX_CONFIRMED',
        txid: null,
        amount: null,
        endToEndId: null,
      });

      await expect(
        service.handleFitbankWebhook(EMPTY_HEADERS, '{}', bodyWithoutTxid),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
