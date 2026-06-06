import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { TrustScoreService } from '../trust-score/trust-score.service';
import { BlockchainRecordsService } from '../blockchain-records/blockchain-records.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  createPrismaMock,
  makeDispute,
  makeGuaranteedAgreement,
  makeFinancialGuarantee,
} from '../../test/helpers/factories';

describe('AdminService', () => {
  let service: AdminService;
  let prisma: ReturnType<typeof createPrismaMock>;
  let auditLogs: jest.Mocked<Pick<AuditLogsService, 'log'>>;
  let trustScore: jest.Mocked<Pick<TrustScoreService, 'recordEvent'>>;
  let blockchainRecords: jest.Mocked<Pick<BlockchainRecordsService, 'createPending'>>;
  let notifications: jest.Mocked<Pick<NotificationsService, 'send'>>;

  const ADMIN_ID = 'system-admin';
  const DISPUTE_ID = 'disp-001';

  const PAID_INTENT = {
    id: 'pi-001',
    status: 'PAID',
    amount: { toNumber: () => 350, toString: () => '350.00' },
    currency: 'BRL',
    paidAt: new Date('2026-01-02'),
    payerId: 'user-a',
  };

  function makeFullDispute(status = 'OPEN', guaranteeStatus = 'FROZEN_DISPUTE') {
    return {
      ...makeDispute({ status }),
      agreement: {
        ...makeGuaranteedAgreement({
          financialStatus: status === 'OPEN' ? 'DISPUTED' : 'PAID_OUT',
        }),
        participants: [{ userId: 'user-a' }, { userId: 'user-b' }],
        financialGuarantee: makeFinancialGuarantee({
          status: guaranteeStatus,
          paymentIntents: [PAID_INTENT],
        }),
        payerId: 'user-a',
        receiverId: 'user-b',
      },
    };
  }

  beforeEach(async () => {
    prisma = createPrismaMock();
    auditLogs = { log: jest.fn().mockResolvedValue({}) };
    trustScore = { recordEvent: jest.fn().mockResolvedValue(undefined) };
    blockchainRecords = { createPending: jest.fn().mockResolvedValue(undefined) };
    notifications = { send: jest.fn().mockResolvedValue({}) };

    const module = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogsService, useValue: auditLogs },
        { provide: TrustScoreService, useValue: trustScore },
        { provide: BlockchainRecordsService, useValue: blockchainRecords },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile();

    service = module.get(AdminService);
  });

  // ── getStats ─────────────────────────────────────────────────

  describe('getStats', () => {
    it('retorna contadores de usuários, acordos e disputas', async () => {
      prisma.user.count.mockResolvedValue(10);
      prisma.agreement.count.mockResolvedValue(25);
      prisma.dispute.count
        .mockResolvedValueOnce(5)  // totalDisputes
        .mockResolvedValueOnce(2); // openDisputes

      const result = await service.getStats();

      expect(result.totalUsers).toBe(10);
      expect(result.totalAgreements).toBe(25);
      expect(result.totalDisputes).toBe(5);
      expect(result.openDisputes).toBe(2);
      expect(result.generatedAt).toBeDefined();
    });
  });

  // ── listDisputes ─────────────────────────────────────────────

  describe('listDisputes', () => {
    it('retorna lista paginada de disputas sem filtro', async () => {
      const disputes = [makeDispute(), makeDispute({ id: 'disp-002', status: 'RESOLVED_FAVOR_CREATOR' })];
      prisma.dispute.findMany.mockResolvedValue(disputes);
      prisma.dispute.count.mockResolvedValue(2);

      const result = await service.listDisputes({});
      expect(result.data.length).toBe(2);
      expect(result.total).toBe(2);
    });

    it('filtra disputas por status OPEN', async () => {
      prisma.dispute.findMany.mockResolvedValue([makeDispute()]);
      prisma.dispute.count.mockResolvedValue(1);

      const result = await service.listDisputes({ status: 'OPEN' as any });

      const findCall = prisma.dispute.findMany.mock.calls[0][0];
      expect(findCall.where).toMatchObject({ status: 'OPEN' });
      expect(result.total).toBe(1);
    });

    it('retorna lista vazia quando não há disputas', async () => {
      prisma.dispute.findMany.mockResolvedValue([]);
      prisma.dispute.count.mockResolvedValue(0);

      const result = await service.listDisputes({});
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  // ── getDispute ────────────────────────────────────────────────

  describe('getDispute', () => {
    it('retorna detalhe completo da disputa', async () => {
      const dispute = makeFullDispute();
      prisma.dispute.findUnique.mockResolvedValue(dispute);

      const result = await service.getDispute(DISPUTE_ID);
      expect(result.id).toBe('disp-001');
    });

    it('lança NotFoundException para disputa inexistente', async () => {
      prisma.dispute.findUnique.mockResolvedValue(null);

      await expect(service.getDispute('ghost')).rejects.toThrow(NotFoundException);
    });
  });

  // ── resolveRelease ────────────────────────────────────────────

  describe('resolveRelease', () => {
    const dto = { reason: 'Serviço comprovadamente entregue pelo recebedor.' };

    it('libera valor ao recebedor e encerra disputa', async () => {
      const dispute = makeFullDispute('OPEN', 'FROZEN_DISPUTE');
      prisma.dispute.findUnique.mockResolvedValue(dispute);
      prisma.receivingKey.findFirst.mockResolvedValue({ id: 'rk-002', key: '@bob', normalizedKey: 'bob' });
      prisma.payout.create.mockResolvedValue({ id: 'pay-001' });
      prisma.financialGuarantee.update.mockResolvedValue({});
      prisma.agreement.update.mockResolvedValue({});
      prisma.dispute.update.mockResolvedValue({});
      prisma.agreementEvent.createMany.mockResolvedValue({ count: 4 });
      prisma.agreementStatusHistory.create.mockResolvedValue({});
      prisma.disputeMessage.create.mockResolvedValue({ id: 'msg-r' });

      const result = await service.resolveRelease(ADMIN_ID, DISPUTE_ID, dto);

      expect(prisma.payout.create).toHaveBeenCalledTimes(1);
      expect(prisma.dispute.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'RESOLVED_FAVOR_COUNTERPART' }),
        }),
      );
      expect(auditLogs.log).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined();
    });

    it('lança NotFoundException para disputa inexistente', async () => {
      prisma.dispute.findUnique.mockResolvedValue(null);

      await expect(service.resolveRelease(ADMIN_ID, 'ghost', dto)).rejects.toThrow(NotFoundException);
    });

    it('lança BadRequestException quando disputa não está OPEN', async () => {
      const dispute = makeFullDispute('RESOLVED_FAVOR_COUNTERPART', 'PAID_OUT');
      prisma.dispute.findUnique.mockResolvedValue(dispute);

      await expect(service.resolveRelease(ADMIN_ID, DISPUTE_ID, dto)).rejects.toThrow(BadRequestException);
    });

    it('lança BadRequestException quando garantia não está FROZEN_DISPUTE', async () => {
      const dispute = makeFullDispute('OPEN', 'LOCKED');
      prisma.dispute.findUnique.mockResolvedValue(dispute);

      await expect(service.resolveRelease(ADMIN_ID, DISPUTE_ID, dto)).rejects.toThrow(BadRequestException);
    });

    it('atualiza trust score de vencedor e perdedor', async () => {
      const dispute = makeFullDispute('OPEN', 'FROZEN_DISPUTE');
      prisma.dispute.findUnique.mockResolvedValue(dispute);
      prisma.receivingKey.findFirst.mockResolvedValue({ id: 'rk-002', key: '@bob', normalizedKey: 'bob' });
      prisma.payout.create.mockResolvedValue({ id: 'pay-001' });
      prisma.financialGuarantee.update.mockResolvedValue({});
      prisma.agreement.update.mockResolvedValue({});
      prisma.dispute.update.mockResolvedValue({});
      prisma.agreementEvent.createMany.mockResolvedValue({ count: 4 });
      prisma.agreementStatusHistory.create.mockResolvedValue({});
      prisma.disputeMessage.create.mockResolvedValue({ id: 'msg-r' });

      await service.resolveRelease(ADMIN_ID, DISPUTE_ID, dto);

      expect(trustScore.recordEvent).toHaveBeenCalledTimes(2);
    });
  });

  // ── resolveRefund ─────────────────────────────────────────────

  describe('resolveRefund', () => {
    const dto = { reason: 'Serviço não foi entregue conforme combinado.' };

    it('reembolsa pagador e encerra disputa', async () => {
      const dispute = makeFullDispute('OPEN', 'FROZEN_DISPUTE');
      prisma.dispute.findUnique.mockResolvedValue(dispute);
      prisma.refund.create.mockResolvedValue({ id: 'ref-001' });
      prisma.financialGuarantee.update.mockResolvedValue({});
      prisma.agreement.update.mockResolvedValue({});
      prisma.dispute.update.mockResolvedValue({});
      prisma.agreementEvent.createMany.mockResolvedValue({ count: 4 });
      prisma.agreementStatusHistory.create.mockResolvedValue({});
      prisma.disputeMessage.create.mockResolvedValue({ id: 'msg-r' });

      const result = await service.resolveRefund(ADMIN_ID, DISPUTE_ID, dto);

      expect(prisma.refund.create).toHaveBeenCalledTimes(1);
      expect(prisma.dispute.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'RESOLVED_FAVOR_CREATOR' }),
        }),
      );
      expect(result).toBeDefined();
    });

    it('lança NotFoundException para disputa inexistente', async () => {
      prisma.dispute.findUnique.mockResolvedValue(null);

      await expect(service.resolveRefund(ADMIN_ID, 'ghost', dto)).rejects.toThrow(NotFoundException);
    });

    it('lança BadRequestException quando disputa já está resolvida', async () => {
      const dispute = makeFullDispute('RESOLVED_FAVOR_CREATOR', 'REFUNDED');
      prisma.dispute.findUnique.mockResolvedValue(dispute);

      await expect(service.resolveRefund(ADMIN_ID, DISPUTE_ID, dto)).rejects.toThrow(BadRequestException);
    });

    it('notifica participantes após resolução', async () => {
      const dispute = makeFullDispute('OPEN', 'FROZEN_DISPUTE');
      prisma.dispute.findUnique.mockResolvedValue(dispute);
      prisma.refund.create.mockResolvedValue({ id: 'ref-001' });
      prisma.financialGuarantee.update.mockResolvedValue({});
      prisma.agreement.update.mockResolvedValue({});
      prisma.dispute.update.mockResolvedValue({});
      prisma.agreementEvent.createMany.mockResolvedValue({ count: 4 });
      prisma.agreementStatusHistory.create.mockResolvedValue({});
      prisma.disputeMessage.create.mockResolvedValue({ id: 'msg-r' });

      await service.resolveRefund(ADMIN_ID, DISPUTE_ID, dto);

      expect(notifications.send).toHaveBeenCalled();
    });
  });
});
