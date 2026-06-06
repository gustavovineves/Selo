import { Test } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { TrustScoreService } from '../trust-score/trust-score.service';
import { BlockchainRecordsService } from '../blockchain-records/blockchain-records.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  createPrismaMock,
  makePaymentIntent,
  makeGuaranteedAgreement,
  makeFinancialGuarantee,
} from '../../test/helpers/factories';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    prisma = createPrismaMock();

    const module = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogsService, useValue: { log: jest.fn().mockResolvedValue({}) } },
        { provide: TrustScoreService, useValue: { recordEvent: jest.fn() } },
        { provide: BlockchainRecordsService, useValue: { createPending: jest.fn() } },
        { provide: NotificationsService, useValue: { send: jest.fn().mockResolvedValue({}) } },
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
});
