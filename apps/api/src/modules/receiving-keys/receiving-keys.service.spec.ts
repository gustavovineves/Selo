import { Test } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ReceivingKeysService } from './receiving-keys.service';
import { PrismaService } from '../../prisma/prisma.service';
import { createPrismaMock, makeReceivingKey } from '../../test/helpers/factories';

describe('ReceivingKeysService', () => {
  let service: ReceivingKeysService;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    prisma = createPrismaMock();

    const module = await Test.createTestingModule({
      providers: [
        ReceivingKeysService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(ReceivingKeysService);
  });

  // ── create ────────────────────────────────────────────────────

  describe('create', () => {
    it('cria chave válida e retorna dados seguros', async () => {
      const key = makeReceivingKey();
      prisma.receivingKey.findFirst.mockResolvedValue(null); // sem ativa
      prisma.receivingKey.findUnique.mockResolvedValue(null); // handle disponível
      prisma.receivingKey.create.mockResolvedValue(key);

      const result = await service.create('user-a', { key: '@alice' });

      expect(prisma.receivingKey.create).toHaveBeenCalledTimes(1);
      expect(result.key).toBe('@alice');
    });

    it('normaliza handle com @ e maiúsculas', async () => {
      prisma.receivingKey.findFirst.mockResolvedValue(null);
      prisma.receivingKey.findUnique.mockResolvedValue(null);
      prisma.receivingKey.create.mockResolvedValue(makeReceivingKey({ key: '@alice', normalizedKey: 'alice' }));

      await service.create('user-a', { key: '@ALICE' });

      const createCall = prisma.receivingKey.create.mock.calls[0][0];
      expect(createCall.data.normalizedKey).toBe('alice');
      expect(createCall.data.key).toBe('@alice');
    });

    it('lança ConflictException se já tem chave ativa', async () => {
      prisma.receivingKey.findFirst.mockResolvedValue(makeReceivingKey());

      await expect(service.create('user-a', { key: '@alice' })).rejects.toThrow(ConflictException);
      expect(prisma.receivingKey.create).not.toHaveBeenCalled();
    });

    it('lança ConflictException se handle já está em uso', async () => {
      prisma.receivingKey.findFirst.mockResolvedValue(null); // sem ativa
      prisma.receivingKey.findUnique.mockResolvedValue(makeReceivingKey({ userId: 'user-x' }));

      await expect(service.create('user-a', { key: '@alice' })).rejects.toThrow(ConflictException);
    });

    it('lança BadRequestException para handle muito curto', async () => {
      await expect(service.create('user-a', { key: '@ab' })).rejects.toThrow(BadRequestException);
    });

    it('lança BadRequestException para handle muito longo (>30)', async () => {
      const longHandle = 'a'.repeat(31);
      await expect(service.create('user-a', { key: longHandle })).rejects.toThrow(BadRequestException);
    });

    it('lança BadRequestException para handle com caracteres inválidos', async () => {
      await expect(service.create('user-a', { key: '@alice!' })).rejects.toThrow(BadRequestException);
    });

    it('lança BadRequestException para handles reservados', async () => {
      await expect(service.create('user-a', { key: 'admin' })).rejects.toThrow(BadRequestException);
      await expect(service.create('user-a', { key: 'selo' })).rejects.toThrow(BadRequestException);
      await expect(service.create('user-a', { key: 'api' })).rejects.toThrow(BadRequestException);
    });
  });

  // ── findActive ────────────────────────────────────────────────

  describe('findActive', () => {
    it('retorna chave ativa do usuário', async () => {
      const key = makeReceivingKey();
      prisma.receivingKey.findFirst.mockResolvedValue(key);

      const result = await service.findActive('user-a');
      expect(result.key).toBe('@alice');
    });

    it('lança NotFoundException quando não há chave ativa', async () => {
      prisma.receivingKey.findFirst.mockResolvedValue(null);

      await expect(service.findActive('user-a')).rejects.toThrow(NotFoundException);
    });
  });

  // ── checkAvailability ─────────────────────────────────────────

  describe('checkAvailability', () => {
    it('retorna available=true para handle livre', async () => {
      prisma.receivingKey.findUnique.mockResolvedValue(null);

      const result = await service.checkAvailability('livre');
      expect(result.available).toBe(true);
    });

    it('retorna available=false para handle em uso', async () => {
      prisma.receivingKey.findUnique.mockResolvedValue(makeReceivingKey());

      const result = await service.checkAvailability('alice');
      expect(result.available).toBe(false);
    });

    it('retorna available=false com reason=reserved para handles reservados', async () => {
      const result = await service.checkAvailability('admin');
      expect(result.available).toBe(false);
      expect((result as { available: boolean; reason?: string }).reason).toBe('reserved');
    });

    it('retorna available=false com reason=invalid_format para formato inválido', async () => {
      const result = await service.checkAvailability('ab'); // muito curto
      expect(result.available).toBe(false);
      expect((result as { available: boolean; reason?: string }).reason).toBe('invalid_format');
    });
  });

  // ── resolve ───────────────────────────────────────────────────

  describe('resolve', () => {
    it('retorna dados públicos seguros para chave ativa', async () => {
      prisma.receivingKey.findUnique.mockResolvedValue(makeReceivingKey());

      const result = await service.resolve('alice');
      expect(result.userId).toBe('user-a');
      expect(result.key).toBe('@alice');
      expect(result.canReceiveAgreements).toBe(true);
    });

    it('lança NotFoundException para chave inexistente', async () => {
      prisma.receivingKey.findUnique.mockResolvedValue(null);

      await expect(service.resolve('ghost')).rejects.toThrow(NotFoundException);
    });

    it('lança NotFoundException para chave deletada', async () => {
      prisma.receivingKey.findUnique.mockResolvedValue(makeReceivingKey({ status: 'DELETED' }));

      await expect(service.resolve('alice')).rejects.toThrow(NotFoundException);
    });
  });

  // ── remove ────────────────────────────────────────────────────

  describe('remove', () => {
    it('faz soft delete da chave ativa quando não há pendências', async () => {
      const key = makeReceivingKey();
      prisma.receivingKey.findFirst.mockResolvedValue(key);
      // Nenhum bloqueio
      prisma.agreement.findFirst.mockResolvedValue(null);
      prisma.paymentIntent.findFirst.mockResolvedValue(null);
      prisma.payout.findFirst.mockResolvedValue(null);
      prisma.refund.findFirst.mockResolvedValue(null);
      prisma.dispute.findFirst.mockResolvedValue(null);
      prisma.receivingKey.update.mockResolvedValue({ ...key, status: 'DELETED', deletedAt: new Date() });

      const result = await service.remove('user-a');
      expect(result.status).toBe('DELETED');
      expect(result.deletedAt).toBeInstanceOf(Date);
    });

    it('lança NotFoundException quando não há chave ativa', async () => {
      prisma.receivingKey.findFirst.mockResolvedValue(null);

      await expect(service.remove('user-a')).rejects.toThrow(NotFoundException);
    });

    it('lança ConflictException quando há acordo ativo bloqueando', async () => {
      prisma.receivingKey.findFirst.mockResolvedValue(makeReceivingKey());
      prisma.agreement.findFirst.mockResolvedValue({ id: 'agr-001', operationalStatus: 'ACTIVE' });

      await expect(service.remove('user-a')).rejects.toThrow(ConflictException);
      expect(prisma.receivingKey.update).not.toHaveBeenCalled();
    });

    it('lança ConflictException quando há disputa aberta bloqueando', async () => {
      prisma.receivingKey.findFirst.mockResolvedValue(makeReceivingKey());
      prisma.agreement.findFirst.mockResolvedValue(null);
      prisma.paymentIntent.findFirst.mockResolvedValue(null);
      prisma.payout.findFirst.mockResolvedValue(null);
      prisma.refund.findFirst.mockResolvedValue(null);
      prisma.dispute.findFirst.mockResolvedValue({ id: 'disp-001', status: 'OPEN' });

      await expect(service.remove('user-a')).rejects.toThrow(ConflictException);
    });
  });
});
