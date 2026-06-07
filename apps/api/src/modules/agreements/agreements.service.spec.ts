import { Test } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AgreementsService } from './agreements.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { TrustScoreService } from '../trust-score/trust-score.service';
import { BlockchainRecordsService } from '../blockchain-records/blockchain-records.service';
import { ReceivingDestinationsService } from '../receiving-destinations/receiving-destinations.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  createPrismaMock,
  makeAgreement,
  makeGuaranteedAgreement,
  makeReceivingKey,
  makeReceivingKeyB,
  makeReceivingDestination,
  makeFinancialGuarantee,
  makeParticipant,
} from '../../test/helpers/factories';
import { PAYMENT_PROVIDER_TOKEN } from '../payments/providers/payment-provider.interface';

describe('AgreementsService', () => {
  let service: AgreementsService;
  let prisma: ReturnType<typeof createPrismaMock>;
  let notifications: jest.Mocked<Pick<NotificationsService, 'send'>>;
  let auditLogs: jest.Mocked<Pick<AuditLogsService, 'log'>>;
  let trustScore: jest.Mocked<Pick<TrustScoreService, 'recordEvent'>>;
  let blockchainRecords: jest.Mocked<Pick<BlockchainRecordsService, 'createPending' | 'createProof'>>;
  let receivingDestinations: jest.Mocked<Pick<ReceivingDestinationsService, 'findAnyActive' | 'maskValue'>>;

  const CREATOR_ID = 'user-a';
  const COUNTERPART_ID = 'user-b';

  function makeFindOneMock(agr = makeAgreement()) {
    prisma.agreement.findUnique.mockResolvedValue({
      ...agr,
      events: [],
      statusHistory: [],
    });
  }

  beforeEach(async () => {
    prisma = createPrismaMock();

    notifications = { send: jest.fn().mockResolvedValue({}) };
    auditLogs = { log: jest.fn().mockResolvedValue({}) };
    trustScore = { recordEvent: jest.fn().mockResolvedValue(undefined) };
    blockchainRecords = {
      createPending: jest.fn().mockResolvedValue(undefined),
      createProof: jest.fn().mockResolvedValue(undefined),
    };
    receivingDestinations = {
      findAnyActive: jest.fn(),
      maskValue: jest.fn().mockReturnValue('e***@test.com'),
    };

    const mockPaymentProvider = {
      providerName: 'SIMULATED',
      createPixCharge: jest.fn().mockReturnValue({
        txid: 'test-txid-001',
        pixKey: 'SELO-PLATFORM@DEV.LOCAL',
        pixKeyType: 'RANDOM',
        qrCode: '000201test-qr-code',
        rawRequest: { simulated: true },
        rawResponse: { txid: 'test-txid-001', status: 'ACTIVE' },
        instructions: 'Ambiente de desenvolvimento: use o botão de simulação.',
        providerName: 'SIMULATED',
      }),
      validateWebhookSignature: jest.fn().mockReturnValue(true),
      parseWebhookPayload: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        AgreementsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogsService, useValue: auditLogs },
        { provide: TrustScoreService, useValue: trustScore },
        { provide: BlockchainRecordsService, useValue: blockchainRecords },
        { provide: ReceivingDestinationsService, useValue: receivingDestinations },
        { provide: NotificationsService, useValue: notifications },
        { provide: PAYMENT_PROVIDER_TOKEN, useValue: mockPaymentProvider },
      ],
    }).compile();

    service = module.get(AgreementsService);
  });

  // ── createSimple ─────────────────────────────────────────────

  describe('createSimple', () => {
    const dto = {
      title: 'Acordo simples',
      counterpartyKey: '@bob',
      dueDate: '2027-12-31T23:59:59.000Z',
    };

    it('cria acordo simples e retorna com participantes e eventos', async () => {
      const keyB = makeReceivingKeyB();
      const agr = makeAgreement();

      prisma.receivingKey.findUnique.mockResolvedValue(keyB);
      prisma.userProfile.findUnique.mockResolvedValue({ fullName: 'Alice Test', displayName: 'Alice' });
      prisma.agreement.create.mockResolvedValue(agr);
      prisma.agreementParticipant.createMany.mockResolvedValue({ count: 2 });
      prisma.agreementEvent.createMany.mockResolvedValue({ count: 2 });
      prisma.agreementStatusHistory.create.mockResolvedValue({});
      makeFindOneMock(agr);

      const result = await service.createSimple(CREATOR_ID, dto);
      expect(result.id).toBe('agr-001');
    });

    it('lança BadRequestException ao criar acordo consigo mesmo', async () => {
      const selfKey = makeReceivingKey({ userId: CREATOR_ID });
      prisma.receivingKey.findUnique.mockResolvedValue(selfKey);

      await expect(service.createSimple(CREATOR_ID, dto)).rejects.toThrow(BadRequestException);
    });

    it('lança NotFoundException para contraparte inexistente', async () => {
      prisma.receivingKey.findUnique.mockResolvedValue(null);

      await expect(service.createSimple(CREATOR_ID, dto)).rejects.toThrow(NotFoundException);
    });

    it('lança NotFoundException para chave da contraparte inativa', async () => {
      prisma.receivingKey.findUnique.mockResolvedValue({ ...makeReceivingKeyB(), status: 'DELETED' });

      await expect(service.createSimple(CREATOR_ID, dto)).rejects.toThrow(NotFoundException);
    });
  });

  // ── createGuaranteed ─────────────────────────────────────────

  describe('createGuaranteed', () => {
    const dto = {
      title: 'Acordo com garantia',
      counterpartyKey: '@bob',
      amount: 350,
      currency: 'BRL',
      dueDate: '2027-12-31T23:59:59.000Z',
    };

    it('lança BadRequestException quando KYC não foi iniciado (PENDING)', async () => {
      prisma.receivingKey.findUnique.mockResolvedValue(makeReceivingKeyB());
      prisma.userProfile.findUnique.mockResolvedValue({ fullName: 'Alice Test', displayName: 'Alice' });
      prisma.user.findUnique.mockResolvedValue({ kycStatus: 'PENDING' });

      await expect(service.createGuaranteed(CREATOR_ID, dto)).rejects.toThrow(BadRequestException);
    });

    it('lança BadRequestException quando recebedor não tem destino ativo', async () => {
      prisma.receivingKey.findUnique.mockResolvedValue(makeReceivingKeyB());
      prisma.userProfile.findUnique.mockResolvedValue({ fullName: 'Alice Test', displayName: 'Alice' });
      prisma.user.findUnique.mockResolvedValue({ kycStatus: 'SUBMITTED' });
      receivingDestinations.findAnyActive.mockResolvedValue(null);

      await expect(service.createGuaranteed(CREATOR_ID, dto)).rejects.toThrow(BadRequestException);
    });

    it('lança BadRequestException ao criar acordo com garantia consigo mesmo', async () => {
      const selfKey = makeReceivingKey({ userId: CREATOR_ID });
      prisma.receivingKey.findUnique.mockResolvedValue(selfKey);

      await expect(service.createGuaranteed(CREATOR_ID, dto)).rejects.toThrow(BadRequestException);
    });

    it('cria acordo com garantia quando recebedor tem destino ativo e KYC iniciado', async () => {
      const keyB = makeReceivingKeyB();
      const agr = makeGuaranteedAgreement();
      const dest = makeReceivingDestination();

      prisma.receivingKey.findUnique.mockResolvedValue(keyB);
      prisma.userProfile.findUnique.mockResolvedValue({ fullName: 'Alice Test', displayName: 'Alice' });
      prisma.user.findUnique.mockResolvedValue({ kycStatus: 'SUBMITTED' });
      receivingDestinations.findAnyActive.mockResolvedValue(dest);
      prisma.agreement.create.mockResolvedValue(agr);
      prisma.agreementParticipant.createMany.mockResolvedValue({ count: 2 });
      prisma.financialGuarantee.create.mockResolvedValue(makeFinancialGuarantee());
      prisma.agreementEvent.createMany.mockResolvedValue({ count: 2 });
      prisma.agreementStatusHistory.create.mockResolvedValue({});
      makeFindOneMock(agr);

      const result = await service.createGuaranteed(CREATOR_ID, dto);
      expect(result.id).toBe('agr-002');
    });
  });

  // ── accept ───────────────────────────────────────────────────

  describe('accept', () => {
    it('aceita acordo e muda status para ACTIVE', async () => {
      const agr = makeAgreement({
        operationalStatus: 'AWAITING_ACCEPTANCE',
        participants: [
          makeParticipant({ userId: CREATOR_ID, role: 'CREATOR', status: 'ACCEPTED' }),
          makeParticipant({ userId: COUNTERPART_ID, role: 'COUNTERPART', status: 'PENDING' }),
        ],
      });
      prisma.agreement.findUnique.mockResolvedValue(agr);
      prisma.agreement.update.mockResolvedValue({ ...agr, operationalStatus: 'ACTIVE' });
      prisma.agreementParticipant.update.mockResolvedValue({});
      prisma.agreementEvent.create.mockResolvedValue({});
      prisma.agreementStatusHistory.create.mockResolvedValue({});

      const accepted = { ...agr, operationalStatus: 'ACTIVE' };
      prisma.agreement.findUnique
        .mockResolvedValueOnce(agr) // loadAndVerifyAccess
        .mockResolvedValueOnce(accepted); // findOne

      await service.accept(COUNTERPART_ID, agr.id);
      expect(prisma.agreement.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { operationalStatus: 'ACTIVE' } }),
      );
    });

    it('lança ForbiddenException quando criador tenta aceitar o próprio acordo', async () => {
      const agr = makeAgreement();
      prisma.agreement.findUnique.mockResolvedValue(agr);

      await expect(service.accept(CREATOR_ID, agr.id)).rejects.toThrow(ForbiddenException);
    });

    it('lança BadRequestException para acordo que não está em AWAITING_ACCEPTANCE', async () => {
      const agr = makeAgreement({ operationalStatus: 'ACTIVE' });
      prisma.agreement.findUnique.mockResolvedValue(agr);

      await expect(service.accept(COUNTERPART_ID, agr.id)).rejects.toThrow(BadRequestException);
    });
  });

  // ── decline ──────────────────────────────────────────────────

  describe('decline', () => {
    it('recusa acordo e muda status para CANCELLED', async () => {
      const agr = makeAgreement({
        operationalStatus: 'AWAITING_ACCEPTANCE',
        participants: [
          makeParticipant({ userId: CREATOR_ID, role: 'CREATOR', status: 'ACCEPTED' }),
          makeParticipant({ userId: COUNTERPART_ID, role: 'COUNTERPART', status: 'PENDING' }),
        ],
      });
      prisma.agreement.findUnique
        .mockResolvedValueOnce(agr)
        .mockResolvedValueOnce({ ...agr, operationalStatus: 'CANCELLED' });
      prisma.agreement.update.mockResolvedValue({});
      prisma.agreementParticipant.update.mockResolvedValue({});
      prisma.agreementEvent.create.mockResolvedValue({});
      prisma.agreementStatusHistory.create.mockResolvedValue({});

      await service.decline(COUNTERPART_ID, agr.id);
      expect(prisma.agreement.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ operationalStatus: 'CANCELLED' }) }),
      );
    });

    it('lança ForbiddenException quando criador tenta recusar o próprio acordo', async () => {
      const agr = makeAgreement({
        operationalStatus: 'AWAITING_ACCEPTANCE',
        participants: [
          makeParticipant({ userId: CREATOR_ID, role: 'CREATOR', status: 'ACCEPTED' }),
          makeParticipant({ userId: COUNTERPART_ID, role: 'COUNTERPART', status: 'PENDING' }),
        ],
      });
      prisma.agreement.findUnique.mockResolvedValue(agr);

      await expect(service.decline(CREATOR_ID, agr.id)).rejects.toThrow(ForbiddenException);
    });
  });

  // ── cancel ───────────────────────────────────────────────────

  describe('cancel', () => {
    it('cancela acordo simples em AWAITING_ACCEPTANCE pelo criador', async () => {
      const agr = makeAgreement({ operationalStatus: 'AWAITING_ACCEPTANCE' });
      prisma.agreement.findUnique
        .mockResolvedValueOnce(agr)
        .mockResolvedValueOnce({ ...agr, operationalStatus: 'CANCELLED' });
      prisma.agreement.update.mockResolvedValue({});
      prisma.agreementEvent.create.mockResolvedValue({});
      prisma.agreementStatusHistory.create.mockResolvedValue({});

      await service.cancel(CREATOR_ID, agr.id);
      expect(prisma.agreement.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ operationalStatus: 'CANCELLED' }) }),
      );
    });

    it('lança ForbiddenException quando contraparte tenta cancelar acordo aguardando aceite', async () => {
      const agr = makeAgreement({ operationalStatus: 'AWAITING_ACCEPTANCE' });
      prisma.agreement.findUnique.mockResolvedValue(agr);

      await expect(service.cancel(COUNTERPART_ID, agr.id)).rejects.toThrow(ForbiddenException);
    });

    it('lança BadRequestException ao cancelar acordo já cancelado', async () => {
      const agr = makeAgreement({ operationalStatus: 'CANCELLED' });
      prisma.agreement.findUnique.mockResolvedValue(agr);

      await expect(service.cancel(CREATOR_ID, agr.id)).rejects.toThrow(BadRequestException);
    });

    it('lança BadRequestException ao cancelar acordo com valor protegido', async () => {
      const agr = makeGuaranteedAgreement({
        operationalStatus: 'ACTIVE',
        financialStatus: 'FUNDS_HELD',
      });
      prisma.agreement.findUnique.mockResolvedValue(agr);

      await expect(service.cancel(CREATOR_ID, agr.id)).rejects.toThrow(BadRequestException);
    });
  });

  // ── complete ─────────────────────────────────────────────────

  describe('complete', () => {
    it('conclui acordo simples ACTIVE', async () => {
      const agr = makeAgreement({ operationalStatus: 'ACTIVE' });
      prisma.agreement.findUnique
        .mockResolvedValueOnce(agr)
        .mockResolvedValueOnce({ ...agr, operationalStatus: 'COMPLETED' });
      prisma.agreement.update.mockResolvedValue({});
      prisma.agreementEvent.createMany.mockResolvedValue({ count: 1 });
      prisma.agreementStatusHistory.create.mockResolvedValue({});

      await service.complete(CREATOR_ID, agr.id);
      expect(prisma.agreement.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ operationalStatus: 'COMPLETED' }) }),
      );
    });

    it('lança BadRequestException ao concluir acordo com garantia via /complete', async () => {
      const agr = makeGuaranteedAgreement({ operationalStatus: 'ACTIVE' });
      prisma.agreement.findUnique.mockResolvedValue(agr);

      await expect(service.complete(CREATOR_ID, agr.id)).rejects.toThrow(BadRequestException);
    });

    it('lança BadRequestException ao concluir acordo já concluído', async () => {
      const agr = makeAgreement({ operationalStatus: 'COMPLETED' });
      prisma.agreement.findUnique.mockResolvedValue(agr);

      await expect(service.complete(CREATOR_ID, agr.id)).rejects.toThrow(BadRequestException);
    });
  });

  // ── openDispute ──────────────────────────────────────────────

  describe('openDispute', () => {
    const dto = { reason: 'Serviço não entregue', description: 'O prazo venceu.' };

    it('abre disputa e muda financialStatus para DISPUTED', async () => {
      const agr = makeGuaranteedAgreement({
        financialStatus: 'FUNDS_HELD',
        dispute: null,
        financialGuarantee: makeFinancialGuarantee({ status: 'LOCKED' }),
      });
      prisma.agreement.findUnique
        .mockResolvedValueOnce(agr)
        .mockResolvedValueOnce({ ...agr, financialStatus: 'DISPUTED' });
      prisma.dispute.create.mockResolvedValue({});
      prisma.financialGuarantee.update.mockResolvedValue({});
      prisma.agreement.update.mockResolvedValue({});
      prisma.agreementEvent.create.mockResolvedValue({});
      prisma.agreementStatusHistory.create.mockResolvedValue({});

      await service.openDispute(COUNTERPART_ID, 'agr-002', dto);
      expect(prisma.dispute.create).toHaveBeenCalledTimes(1);
      expect(prisma.financialGuarantee.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'FROZEN_DISPUTE' } }),
      );
    });

    it('lança BadRequestException para acordo simples', async () => {
      const agr = makeAgreement({ type: 'SIMPLE' });
      prisma.agreement.findUnique.mockResolvedValue(agr);

      await expect(service.openDispute(CREATOR_ID, agr.id, dto)).rejects.toThrow(BadRequestException);
    });

    it('lança BadRequestException quando financialStatus não é FUNDS_HELD', async () => {
      const agr = makeGuaranteedAgreement({ financialStatus: 'AWAITING_PAYMENT' });
      prisma.agreement.findUnique.mockResolvedValue(agr);

      await expect(service.openDispute(CREATOR_ID, agr.id, dto)).rejects.toThrow(BadRequestException);
    });

    it('lança ConflictException quando já existe disputa', async () => {
      const agr = makeGuaranteedAgreement({
        financialStatus: 'FUNDS_HELD',
        dispute: { id: 'disp-001' },
      });
      prisma.agreement.findUnique.mockResolvedValue(agr);

      await expect(service.openDispute(CREATOR_ID, agr.id, dto)).rejects.toThrow(ConflictException);
    });

    it('lança ForbiddenException para usuário não participante', async () => {
      const agr = makeGuaranteedAgreement();
      prisma.agreement.findUnique.mockResolvedValue(agr);

      await expect(service.openDispute('user-ghost', agr.id, dto)).rejects.toThrow(ForbiddenException);
    });
  });

  // ── release (bloqueio por disputa) ───────────────────────────

  describe('release', () => {
    it('lança ConflictException quando há disputa aberta', async () => {
      const agr = makeGuaranteedAgreement({
        financialStatus: 'FUNDS_HELD',
        dispute: { id: 'disp-001', status: 'OPEN' },
      });
      prisma.agreement.findUnique.mockResolvedValue(agr);

      await expect(service.release(CREATOR_ID, agr.id)).rejects.toThrow(ConflictException);
    });

    it('lança BadRequestException quando financialStatus não é FUNDS_HELD', async () => {
      const agr = makeGuaranteedAgreement({
        financialStatus: 'AWAITING_PAYMENT',
        dispute: null,
      });
      prisma.agreement.findUnique.mockResolvedValue(agr);

      await expect(service.release(CREATOR_ID, agr.id)).rejects.toThrow(BadRequestException);
    });

    it('lança BadRequestException para acordo simples', async () => {
      const agr = makeAgreement({ type: 'SIMPLE', dispute: null });
      prisma.agreement.findUnique.mockResolvedValue(agr);

      await expect(service.release(CREATOR_ID, agr.id)).rejects.toThrow(BadRequestException);
    });
  });

  // ── confirmCompletion (bloqueio por disputa) ─────────────────

  describe('confirmCompletion', () => {
    it('lança ConflictException quando há disputa aberta', async () => {
      const agr = makeGuaranteedAgreement({
        operationalStatus: 'ACTIVE',
        financialStatus: 'FUNDS_HELD',
        dispute: { id: 'disp-001', status: 'OPEN' },
      });
      prisma.agreement.findUnique.mockResolvedValue(agr);

      await expect(service.confirmCompletion(CREATOR_ID, agr.id)).rejects.toThrow(ConflictException);
    });

    it('lança BadRequestException para acordo simples', async () => {
      const agr = makeAgreement({ type: 'SIMPLE', dispute: null });
      prisma.agreement.findUnique.mockResolvedValue(agr);

      await expect(service.confirmCompletion(CREATOR_ID, agr.id)).rejects.toThrow(BadRequestException);
    });

    it('lança ConflictException em confirmação duplicada do mesmo usuário', async () => {
      const agr = makeGuaranteedAgreement({
        operationalStatus: 'AWAITING_CONFIRMATION',
        financialStatus: 'FUNDS_HELD',
        dispute: null,
      });
      prisma.agreement.findUnique.mockResolvedValue(agr);
      // Simula que usuário já confirmou antes
      prisma.agreementEvent.findFirst.mockResolvedValue({ id: 'ev-1', type: 'CONFIRMED', actorId: CREATOR_ID });

      await expect(service.confirmCompletion(CREATOR_ID, agr.id)).rejects.toThrow(ConflictException);
    });
  });
});
