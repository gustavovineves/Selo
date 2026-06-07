import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FinancialProfileService } from './financial-profile.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { TrustScoreService } from '../trust-score/trust-score.service';
import { NotificationsService } from '../notifications/notifications.service';
import { createPrismaMock } from '../../test/helpers/factories';

const makeFinancialProfileUser = (kycStatus = 'PENDING', document: string | null = null) => ({
  id: 'user-fp-001',
  document,
  documentType: document ? 'CPF' : null,
  phone: null,
  kycStatus,
  profile: { fullName: 'Alice Test', birthDate: null },
  financialProfile: null,
});

describe('FinancialProfileService', () => {
  let service: FinancialProfileService;
  let prisma: ReturnType<typeof createPrismaMock>;
  let config: { get: jest.Mock };

  beforeEach(async () => {
    prisma = createPrismaMock();
    config = { get: jest.fn((key: string, def?: string) => def ?? 'development') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinancialProfileService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: config },
        { provide: AuditLogsService, useValue: { log: jest.fn().mockResolvedValue({}) } },
        { provide: TrustScoreService, useValue: { recordEvent: jest.fn().mockResolvedValue({}) } },
        { provide: NotificationsService, useValue: { send: jest.fn().mockResolvedValue({}) } },
      ],
    }).compile();

    service = module.get(FinancialProfileService);
  });

  describe('getFinancialProfile', () => {
    it('returns profile with PENDING status label', async () => {
      prisma.user.findUnique.mockResolvedValue(makeFinancialProfileUser('PENDING'));
      const result = await service.getFinancialProfile('user-fp-001');
      expect(result.kycStatus).toBe('PENDING');
      expect(result.kycStatusLabel).toBe('Verificação não iniciada');
      expect(result.cpfMasked).toBeNull();
      expect(result.pendingRequirements.length).toBeGreaterThan(0);
    });

    it('returns masked CPF when document is present', async () => {
      prisma.user.findUnique.mockResolvedValue(
        makeFinancialProfileUser('SUBMITTED', '11144477735'),
      );
      const result = await service.getFinancialProfile('user-fp-001');
      expect(result.cpfMasked).toBe('***.444.777-**');
      expect(result.kycStatusLabel).toBe('Em análise');
    });

    it('returns no pending requirements when APPROVED', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...makeFinancialProfileUser('APPROVED', '11144477735'),
        phone: '+5511999999999',
        profile: { fullName: 'Alice Test', birthDate: new Date('1990-01-01') },
        financialProfile: { acceptedFinancialTermsAt: new Date(), verificationLevel: 'FULL' },
      });
      const result = await service.getFinancialProfile('user-fp-001');
      expect(result.pendingRequirements).toHaveLength(0);
      expect(result.humanMessage).toContain('verificado');
    });
  });

  describe('updateFinancialProfile', () => {
    it('rejects invalid CPF', async () => {
      await expect(
        service.updateFinancialProfile('user-fp-001', { cpf: '11111111111' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('accepts valid CPF and updates', async () => {
      // Setup: tx mock that has all needed methods
      const txMock = {
        ...prisma,
        user: { ...prisma.user, findFirst: jest.fn().mockResolvedValue(null), update: jest.fn().mockResolvedValue({}) },
        userProfile: { ...prisma.userProfile, upsert: jest.fn().mockResolvedValue({}), findUnique: jest.fn().mockResolvedValue(null) },
        financialProfile: { ...prisma.financialProfile, upsert: jest.fn().mockResolvedValue({}) },
      };
      prisma.$transaction.mockImplementation(async (fn: unknown) => {
        if (typeof fn === 'function') return fn(txMock);
      });

      // After tx, getFinancialProfile is called
      prisma.user.findUnique.mockResolvedValue(
        makeFinancialProfileUser('PENDING', '11144477735'),
      );

      await expect(
        service.updateFinancialProfile('user-fp-001', { cpf: '11144477735', fullName: 'Alice Nova' }),
      ).resolves.toBeDefined();
    });

    it('rejects duplicate CPF from another user', async () => {
      const txMock = {
        ...prisma,
        user: {
          ...prisma.user,
          findFirst: jest.fn().mockResolvedValue({ id: 'other-user' }),
          update: jest.fn().mockResolvedValue({}),
        },
        userProfile: { ...prisma.userProfile, upsert: jest.fn().mockResolvedValue({}) },
        financialProfile: { ...prisma.financialProfile, upsert: jest.fn().mockResolvedValue({}) },
      };
      prisma.$transaction.mockImplementation(async (fn: unknown) => {
        if (typeof fn === 'function') return fn(txMock);
      });
      await expect(
        service.updateFinancialProfile('user-fp-001', { cpf: '11144477735' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('submitForReview', () => {
    it('rejects submission without accepted terms', async () => {
      prisma.user.findUnique.mockResolvedValue(
        makeFinancialProfileUser('PENDING', '11144477735'),
      );
      await expect(service.submitForReview('user-fp-001')).rejects.toThrow(BadRequestException);
    });

    it('rejects submission without CPF', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...makeFinancialProfileUser('PENDING'),
        financialProfile: { acceptedFinancialTermsAt: new Date(), verificationLevel: 'BASIC' },
      });
      await expect(service.submitForReview('user-fp-001')).rejects.toThrow(BadRequestException);
    });

    it('rejects if already submitted', async () => {
      prisma.user.findUnique.mockResolvedValue(
        makeFinancialProfileUser('SUBMITTED', '11144477735'),
      );
      await expect(service.submitForReview('user-fp-001')).rejects.toThrow(BadRequestException);
    });

    it('submits successfully and updates kycStatus to SUBMITTED', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce({
          ...makeFinancialProfileUser('REJECTED', '11144477735'),
          financialProfile: { acceptedFinancialTermsAt: new Date(), verificationLevel: 'BASIC' },
        })
        .mockResolvedValueOnce(makeFinancialProfileUser('SUBMITTED', '11144477735'));
      prisma.$transaction.mockResolvedValue([{}, {}]);

      const result = await service.submitForReview('user-fp-001');
      expect(result).toBeDefined();
    });
  });

  describe('simulateApproval', () => {
    it('blocks simulation in production', async () => {
      config.get.mockImplementation((key: string) =>
        key === 'NODE_ENV' ? 'production' : undefined,
      );
      await expect(service.simulateApproval('user-fp-001')).rejects.toThrow(ForbiddenException);
    });

    it('approves user in development', async () => {
      config.get.mockImplementation(() => 'development');
      prisma.$transaction.mockResolvedValue([{}, {}]);
      prisma.user.findUnique.mockResolvedValue(makeFinancialProfileUser('APPROVED', '11144477735'));

      const result = await service.simulateApproval('user-fp-001');
      expect(result).toBeDefined();
    });
  });

  describe('simulateRejection', () => {
    it('blocks simulation in production', async () => {
      config.get.mockImplementation((key: string) =>
        key === 'NODE_ENV' ? 'production' : undefined,
      );
      await expect(service.simulateRejection('user-fp-001')).rejects.toThrow(ForbiddenException);
    });

    it('rejects user in development with reason', async () => {
      config.get.mockImplementation(() => 'test');
      prisma.$transaction.mockResolvedValue([{}, {}]);
      prisma.user.findUnique.mockResolvedValue(makeFinancialProfileUser('REJECTED', '11144477735'));

      const result = await service.simulateRejection('user-fp-001', 'CPF divergente');
      expect(result).toBeDefined();
    });
  });
});
