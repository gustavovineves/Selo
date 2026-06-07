import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { BlockchainRecordsService } from './blockchain-records.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BLOCKCHAIN_PROOF_PROVIDER_TOKEN } from './providers/blockchain-proof-provider.interface';
import { SimulatedBlockchainProofProvider } from './providers/simulated-blockchain-proof.provider';
import { createPrismaMock } from '../../test/helpers/factories';

describe('BlockchainRecordsService', () => {
  let service: BlockchainRecordsService;
  let prisma: ReturnType<typeof createPrismaMock>;
  let provider: SimulatedBlockchainProofProvider;

  beforeEach(async () => {
    prisma = createPrismaMock();
    const configService = { get: (key: string, def: string = '') => def } as unknown as ConfigService;
    provider = new SimulatedBlockchainProofProvider(configService);

    const moduleRef = await Test.createTestingModule({
      providers: [
        BlockchainRecordsService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: configService },
        { provide: BLOCKCHAIN_PROOF_PROVIDER_TOKEN, useValue: provider },
      ],
    }).compile();

    service = moduleRef.get(BlockchainRecordsService);
  });

  describe('createProof', () => {
    it('persists a blockchain record after simulated submission', async () => {
      (prisma.blockchainRecord.create as jest.Mock).mockResolvedValue({});

      await service.createProof('agr-001', 'AGREEMENT_CREATED', {
        agreementId: 'agr-001',
        type: 'SIMPLE',
        contentHash: 'abc123',
      });

      expect(prisma.blockchainRecord.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            agreementId: 'agr-001',
            eventType: 'AGREEMENT_CREATED',
            status: 'SUBMITTED',
            proofHash: expect.any(String),
            txHash: expect.any(String),
          }),
        }),
      );
    });

    it('generates different proofHash for different events', async () => {
      const calls: Array<Record<string, unknown>> = [];
      (prisma.blockchainRecord.create as jest.Mock).mockImplementation((args: { data: Record<string, unknown> }) => {
        calls.push(args.data);
        return Promise.resolve({});
      });

      await service.createProof('agr-001', 'AGREEMENT_CREATED', { agreementId: 'agr-001' });
      await service.createProof('agr-001', 'AGREEMENT_ACCEPTED', { agreementId: 'agr-001' });

      expect(calls[0].proofHash).not.toBe(calls[1].proofHash);
    });

    it('generates deterministic proofHash for same input', async () => {
      const hashes: string[] = [];
      (prisma.blockchainRecord.create as jest.Mock).mockImplementation((args: { data: Record<string, unknown> }) => {
        hashes.push(args.data.proofHash as string);
        return Promise.resolve({});
      });

      await service.createProof('agr-001', 'AGREEMENT_CREATED', { amount: '100', currency: 'BRL' });
      await service.createProof('agr-001', 'AGREEMENT_CREATED', { currency: 'BRL', amount: '100' });

      expect(hashes[0]).toBe(hashes[1]);
    });

    it('does not expose CPF in proofData stored', async () => {
      let storedData: Record<string, unknown> | undefined;
      (prisma.blockchainRecord.create as jest.Mock).mockImplementation((args: { data: Record<string, unknown> }) => {
        storedData = args.data.proofData as Record<string, unknown>;
        return Promise.resolve({});
      });

      await service.createProof('agr-001', 'AGREEMENT_CREATED', {
        agreementId: 'agr-001',
        document: '11144477735',
        amount: '100',
      });

      expect(storedData?.document).toBe('[REDACTED]');
    });

    it('does not expose pixKey in proofData stored', async () => {
      let storedData: Record<string, unknown> | undefined;
      (prisma.blockchainRecord.create as jest.Mock).mockImplementation((args: { data: Record<string, unknown> }) => {
        storedData = args.data.proofData as Record<string, unknown>;
        return Promise.resolve({});
      });

      await service.createProof('agr-001', 'DISPUTE_OPENED', {
        agreementId: 'agr-001',
        pixKey: 'alice@test.com',
      });

      expect(storedData?.pixKey).toBe('[REDACTED]');
    });

    it('does not call external network (simulated provider)', async () => {
      (prisma.blockchainRecord.create as jest.Mock).mockResolvedValue({});
      const spy = jest.spyOn(provider, 'submitProof');

      await service.createProof('agr-001', 'AGREEMENT_CREATED', { agreementId: 'agr-001' });

      expect(spy).toHaveBeenCalledTimes(1);
      const result = await spy.mock.results[0].value;
      expect(result.provider).toBe('simulated');
    });

    it('silently catches errors and does not throw', async () => {
      (prisma.blockchainRecord.create as jest.Mock).mockRejectedValue(new Error('DB error'));
      await expect(
        service.createProof('agr-001', 'AGREEMENT_CREATED', {}),
      ).resolves.toBeUndefined();
    });
  });

  describe('createPending (backward-compat)', () => {
    it('uses event field from payload as eventType', async () => {
      (prisma.blockchainRecord.create as jest.Mock).mockResolvedValue({});

      await service.createPending('agr-001', {
        event: 'DISPUTE_OPENED',
        agreementId: 'agr-001',
      });

      expect(prisma.blockchainRecord.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ eventType: 'DISPUTE_OPENED' }),
        }),
      );
    });
  });

  describe('getProofsForUser', () => {
    it('throws NotFoundException when agreement not found', async () => {
      (prisma.agreement.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getProofsForUser('user-a', 'agr-999')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when user is not a participant', async () => {
      (prisma.agreement.findUnique as jest.Mock).mockResolvedValue({
        id: 'agr-001',
        participants: [{ userId: 'user-b' }],
      });

      await expect(service.getProofsForUser('user-a', 'agr-001')).rejects.toThrow(ForbiddenException);
    });

    it('returns public proofs for participant', async () => {
      (prisma.agreement.findUnique as jest.Mock).mockResolvedValue({
        id: 'agr-001',
        participants: [{ userId: 'user-a' }],
      });
      (prisma.blockchainRecord.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'bc-001',
          eventType: 'AGREEMENT_CREATED',
          status: 'SUBMITTED',
          proofHash: 'a'.repeat(64),
          txHash: '0x' + 'b'.repeat(64),
          network: 'POLYGON_TESTNET',
          createdAt: new Date(),
          submittedAt: new Date(),
          confirmedAt: null,
          errorMessage: null,
          retryCount: 0,
          failedAt: null,
        },
      ]);

      const results = await service.getProofsForUser('user-a', 'agr-001');

      expect(results).toHaveLength(1);
      expect(results[0].eventType).toBe('AGREEMENT_CREATED');
      expect(results[0].status).toBe('SUBMITTED');
      expect(results[0].proofHashShort).toContain('…');
      // Full proofHash must NOT be exposed in user-facing response
      const r = results[0] as unknown as Record<string, unknown>;
      expect(r.proofHash).toBeUndefined();
    });
  });

  describe('getProofsForAdmin', () => {
    it('throws NotFoundException when agreement not found', async () => {
      (prisma.agreement.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getProofsForAdmin('agr-999')).rejects.toThrow(NotFoundException);
    });

    it('returns full proofs for admin including proofHash and txHash', async () => {
      (prisma.agreement.findUnique as jest.Mock).mockResolvedValue({ id: 'agr-001' });
      (prisma.blockchainRecord.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'bc-001',
          eventType: 'DISPUTE_RESOLVED',
          status: 'SUBMITTED',
          proofHash: 'c'.repeat(64),
          txHash: '0x' + 'd'.repeat(64),
          network: 'POLYGON_TESTNET',
          createdAt: new Date(),
          submittedAt: new Date(),
          confirmedAt: null,
          errorMessage: null,
          retryCount: 0,
          failedAt: null,
        },
      ]);

      const results = await service.getProofsForAdmin('agr-001');

      expect(results).toHaveLength(1);
      expect(results[0].proofHash).toHaveLength(64);
      expect(results[0].txHash).toContain('0x');
    });
  });
});
