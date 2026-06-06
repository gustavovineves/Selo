import { Test } from '@nestjs/testing';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ReceivingDestinationsService } from './receiving-destinations.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  createPrismaMock,
  makeReceivingDestination,
} from '../../test/helpers/factories';

describe('ReceivingDestinationsService', () => {
  let service: ReceivingDestinationsService;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    prisma = createPrismaMock();

    const module = await Test.createTestingModule({
      providers: [
        ReceivingDestinationsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(ReceivingDestinationsService);
  });

  // ── maskValue ─────────────────────────────────────────────────

  describe('maskValue', () => {
    it('mascara CPF preservando últimos 3 dígitos', () => {
      expect(service.maskValue('PIX_CPF', '12345678901')).toBe('***.901');
    });

    it('mascara email expondo apenas primeira letra do local', () => {
      const masked = service.maskValue('PIX_EMAIL', 'bob@test.com');
      expect(masked).toMatch(/^b\*+@test\.com$/);
    });

    it('mascara telefone preservando últimos 4 dígitos', () => {
      const masked = service.maskValue('PIX_PHONE', '11999991234');
      expect(masked).toContain('1234');
      expect(masked).toMatch(/^\(\*\*\*\)/);
    });

    it('mascara chave aleatória preservando últimos 4 caracteres', () => {
      const masked = service.maskValue('PIX_RANDOM', 'abcdefgh-1234');
      expect(masked).toMatch(/\*{4}-\*{4}-1234$/);
    });

    it('mascara CNPJ corretamente', () => {
      const masked = service.maskValue('PIX_CNPJ', '12345678000100');
      expect(masked).toContain('00');
    });
  });

  // ── create ────────────────────────────────────────────────────

  describe('create', () => {
    const dto = {
      type: 'PIX_EMAIL' as const,
      pixKey: 'bob@test.com',
      label: 'Meu email',
      isDefault: false,
    };

    it('cria destino e retorna sem expor keyValue', async () => {
      const dest = makeReceivingDestination();
      prisma.receivingDestination.count.mockResolvedValue(1); // já tem um destino
      prisma.receivingDestination.create.mockResolvedValue(dest);

      const result = await service.create('user-b', dto);

      expect(prisma.receivingDestination.create).toHaveBeenCalledTimes(1);
      expect(result).not.toHaveProperty('keyValue');
    });

    it('primeiro destino criado vira padrão automaticamente', async () => {
      const dest = makeReceivingDestination({ isDefault: true });
      prisma.receivingDestination.count.mockResolvedValue(0); // nenhum ainda
      prisma.receivingDestination.create.mockResolvedValue(dest);

      await service.create('user-b', { ...dto, isDefault: false });

      const createCall = prisma.receivingDestination.create.mock.calls[0][0];
      expect(createCall.data.isDefault).toBe(true);
    });

    it('promove como padrão e demove o anterior quando isDefault=true', async () => {
      const existing = makeReceivingDestination({ id: 'rd-000', isDefault: true });
      prisma.receivingDestination.findMany.mockResolvedValue([existing]);
      prisma.receivingDestination.updateMany.mockResolvedValue({ count: 1 });
      prisma.receivingDestination.create.mockResolvedValue(makeReceivingDestination({ id: 'rd-001', isDefault: true }));

      await service.create('user-b', { ...dto, isDefault: true });

      expect(prisma.receivingDestination.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isDefault: false } }),
      );
    });
  });

  // ── findAll ───────────────────────────────────────────────────

  describe('findAllByUser', () => {
    it('retorna lista mascarada sem expor keyValue', async () => {
      const dest = makeReceivingDestination();
      prisma.receivingDestination.findMany.mockResolvedValue([dest]);

      const result = await service.findAllByUser('user-b');

      expect(result.length).toBe(1);
      expect(result[0]).not.toHaveProperty('keyValue');
      expect(result[0]).toHaveProperty('maskedValue');
    });

    it('retorna lista vazia quando não há destinos', async () => {
      prisma.receivingDestination.findMany.mockResolvedValue([]);

      const result = await service.findAllByUser('user-b');
      expect(result).toEqual([]);
    });
  });

  // ── findAnyActive ─────────────────────────────────────────────

  describe('findAnyActive', () => {
    it('retorna null quando não há destino ativo', async () => {
      prisma.receivingDestination.findFirst.mockResolvedValue(null);

      const result = await service.findAnyActive('user-b');
      expect(result).toBeNull();
    });

    it('retorna destino ativo quando existe', async () => {
      const dest = makeReceivingDestination();
      prisma.receivingDestination.findFirst.mockResolvedValue(dest);

      const result = await service.findAnyActive('user-b');
      expect(result).toBeDefined();
      expect(result!.id).toBe('rd-001');
    });
  });

  // ── update ────────────────────────────────────────────────────

  describe('update', () => {
    it('atualiza label sem exigir checagem de pendências', async () => {
      const dest = makeReceivingDestination();
      prisma.receivingDestination.findUnique.mockResolvedValue(dest);
      prisma.receivingDestination.update.mockResolvedValue({ ...dest, nickname: 'Novo label' });

      const result = await service.update('user-b', 'rd-001', { label: 'Novo label' });
      expect(result).not.toHaveProperty('keyValue');
    });

    it('lança NotFoundException para destino inexistente', async () => {
      prisma.receivingDestination.findUnique.mockResolvedValue(null);

      await expect(service.update('user-b', 'ghost', { label: 'X' })).rejects.toThrow(NotFoundException);
    });

    it('lança ForbiddenException se o destino não pertence ao usuário', async () => {
      prisma.receivingDestination.findUnique.mockResolvedValue(
        makeReceivingDestination({ userId: 'user-x' }),
      );

      await expect(service.update('user-b', 'rd-001', { label: 'X' })).rejects.toThrow(ForbiddenException);
    });
  });

  // ── remove ────────────────────────────────────────────────────

  describe('remove', () => {
    it('faz soft delete quando não há pendências', async () => {
      const dest = makeReceivingDestination();
      prisma.receivingDestination.findUnique.mockResolvedValue(dest);
      prisma.agreement.findFirst.mockResolvedValue(null);
      prisma.payout.findFirst.mockResolvedValue(null);
      prisma.receivingDestination.update.mockResolvedValue({ ...dest, status: 'DELETED' });

      await service.remove('user-b', 'rd-001');

      expect(prisma.receivingDestination.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'DELETED' }) }),
      );
    });

    it('lança NotFoundException para destino inexistente', async () => {
      prisma.receivingDestination.findUnique.mockResolvedValue(null);

      await expect(service.remove('user-b', 'ghost')).rejects.toThrow(NotFoundException);
    });

    it('lança ForbiddenException se não pertence ao usuário', async () => {
      prisma.receivingDestination.findUnique.mockResolvedValue(
        makeReceivingDestination({ userId: 'user-x' }),
      );

      await expect(service.remove('user-b', 'rd-001')).rejects.toThrow(ForbiddenException);
    });

    it('lança ConflictException quando há acordo bloqueante', async () => {
      prisma.receivingDestination.findUnique.mockResolvedValue(makeReceivingDestination());
      prisma.agreement.findFirst.mockResolvedValue({ id: 'agr-001', operationalStatus: 'ACTIVE' });

      await expect(service.remove('user-b', 'rd-001')).rejects.toThrow(ConflictException);
    });
  });
});
