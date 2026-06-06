import { Test } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DisputesService } from './disputes.service';
import { PrismaService } from '../../prisma/prisma.service';
import { createPrismaMock, makeDispute } from '../../test/helpers/factories';

describe('DisputesService', () => {
  let service: DisputesService;
  let prisma: ReturnType<typeof createPrismaMock>;

  const USER_A = 'user-a';
  const USER_B = 'user-b';
  const GHOST = 'user-ghost';

  beforeEach(async () => {
    prisma = createPrismaMock();

    const module = await Test.createTestingModule({
      providers: [
        DisputesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(DisputesService);
  });

  // ── findOne ───────────────────────────────────────────────────

  describe('findOne', () => {
    it('retorna disputa para participante do acordo', async () => {
      const dispute = makeDispute();
      prisma.dispute.findUnique.mockResolvedValue(dispute);

      const result = await service.findOne(USER_A, dispute.id);
      expect(result.id).toBe('disp-001');
    });

    it('lança NotFoundException para disputa inexistente', async () => {
      prisma.dispute.findUnique.mockResolvedValue(null);

      await expect(service.findOne(USER_A, 'ghost')).rejects.toThrow(NotFoundException);
    });

    it('lança ForbiddenException para usuário não participante', async () => {
      const dispute = makeDispute({
        agreement: { participants: [{ userId: USER_A }, { userId: USER_B }] },
      });
      prisma.dispute.findUnique.mockResolvedValue(dispute);

      await expect(service.findOne(GHOST, dispute.id)).rejects.toThrow(ForbiddenException);
    });

    it('não expõe dados do acordo na resposta (acordo é omitido)', async () => {
      const dispute = makeDispute();
      prisma.dispute.findUnique.mockResolvedValue(dispute);

      const result = await service.findOne(USER_A, dispute.id);
      expect(result).not.toHaveProperty('agreement');
    });
  });

  // ── addMessage (evidência formal) ────────────────────────────

  describe('addMessage', () => {
    const dto = { content: 'Comprovante de entrega.' };

    it('adiciona evidência formal à disputa aberta', async () => {
      const dispute = makeDispute({ status: 'OPEN' });
      prisma.dispute.findUnique.mockResolvedValue(dispute);
      prisma.disputeMessage.create.mockResolvedValue({
        id: 'msg-001',
        disputeId: 'disp-001',
        senderId: USER_A,
        senderType: 'USER',
        type: 'EVIDENCE',
        content: dto.content,
        createdAt: new Date(),
      });

      const result = await service.addMessage(USER_A, 'disp-001', { content: dto.content, type: 'EVIDENCE' });
      expect(result.id).toBe('msg-001');
      expect(prisma.disputeMessage.create).toHaveBeenCalledTimes(1);
    });

    it('usa tipo TEXT como padrão quando type não é informado', async () => {
      const dispute = makeDispute({ status: 'OPEN' });
      prisma.dispute.findUnique.mockResolvedValue(dispute);
      prisma.disputeMessage.create.mockResolvedValue({ id: 'msg-002', type: 'TEXT' });

      await service.addMessage(USER_A, 'disp-001', { content: 'Texto simples.' });

      const createCall = prisma.disputeMessage.create.mock.calls[0][0];
      expect(createCall.data.type).toBe('TEXT');
    });

    it('lança NotFoundException para disputa inexistente', async () => {
      prisma.dispute.findUnique.mockResolvedValue(null);

      await expect(service.addMessage(USER_A, 'ghost', dto)).rejects.toThrow(NotFoundException);
    });

    it('lança ForbiddenException para usuário não participante', async () => {
      const dispute = makeDispute({
        agreement: { participants: [{ userId: USER_A }, { userId: USER_B }] },
      });
      prisma.dispute.findUnique.mockResolvedValue(dispute);

      await expect(service.addMessage(GHOST, 'disp-001', dto)).rejects.toThrow(ForbiddenException);
    });

    it('lança BadRequestException para disputa encerrada (CLOSED)', async () => {
      const dispute = makeDispute({ status: 'CLOSED' });
      prisma.dispute.findUnique.mockResolvedValue(dispute);

      await expect(service.addMessage(USER_A, 'disp-001', dto)).rejects.toThrow(BadRequestException);
    });

    it('lança BadRequestException para disputa retirada (WITHDRAWN)', async () => {
      const dispute = makeDispute({ status: 'WITHDRAWN' });
      prisma.dispute.findUnique.mockResolvedValue(dispute);

      await expect(service.addMessage(USER_A, 'disp-001', dto)).rejects.toThrow(BadRequestException);
    });
  });
});
