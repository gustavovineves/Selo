import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TrustScoreService } from './trust-score.service';
import { PrismaService } from '../../prisma/prisma.service';
import { createPrismaMock, makeTrustScore } from '../../test/helpers/factories';

describe('TrustScoreService', () => {
  let service: TrustScoreService;
  let prisma: ReturnType<typeof createPrismaMock>;

  const USER_ID = 'user-a';

  beforeEach(async () => {
    prisma = createPrismaMock();

    const module = await Test.createTestingModule({
      providers: [
        TrustScoreService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(TrustScoreService);
  });

  // ── findByUser ────────────────────────────────────────────────

  describe('findByUser', () => {
    it('retorna score do usuário', async () => {
      const score = makeTrustScore();
      prisma.trustScore.findUnique.mockResolvedValue(score);

      const result = await service.findByUser(USER_ID);
      expect(result.score).toBe(500);
      expect(result.level).toBe('MEDIUM');
    });

    it('lança NotFoundException quando usuário não tem score', async () => {
      prisma.trustScore.findUnique.mockResolvedValue(null);

      await expect(service.findByUser('ghost')).rejects.toThrow(NotFoundException);
    });
  });

  // ── recordEvent ───────────────────────────────────────────────

  describe('recordEvent', () => {
    it('AGREEMENT_COMPLETED: score +20', async () => {
      const score = makeTrustScore({ score: 500 });
      prisma.trustScore.findUnique.mockResolvedValue(score);
      prisma.trustScore.update.mockResolvedValue({ ...score, score: 520 });
      prisma.trustScoreEvent.create.mockResolvedValue({});

      await service.recordEvent(USER_ID, 'AGREEMENT_COMPLETED', 'agr-001', 'Agreement', 'Acordo concluído');

      expect(prisma.trustScore.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ score: 520 }),
        }),
      );
    });

    it('AGREEMENT_CANCELLED_BY_USER: score -10', async () => {
      const score = makeTrustScore({ score: 500 });
      prisma.trustScore.findUnique.mockResolvedValue(score);
      prisma.trustScore.update.mockResolvedValue({ ...score, score: 490 });
      prisma.trustScoreEvent.create.mockResolvedValue({});

      await service.recordEvent(USER_ID, 'AGREEMENT_CANCELLED_BY_USER');

      expect(prisma.trustScore.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ score: 490 }),
        }),
      );
    });

    it('DISPUTE_WON: score +30', async () => {
      const score = makeTrustScore({ score: 500 });
      prisma.trustScore.findUnique.mockResolvedValue(score);
      prisma.trustScore.update.mockResolvedValue({ ...score, score: 530 });
      prisma.trustScoreEvent.create.mockResolvedValue({});

      await service.recordEvent(USER_ID, 'DISPUTE_WON');

      expect(prisma.trustScore.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ score: 530 }),
        }),
      );
    });

    it('DISPUTE_LOST: score -50', async () => {
      const score = makeTrustScore({ score: 500 });
      prisma.trustScore.findUnique.mockResolvedValue(score);
      prisma.trustScore.update.mockResolvedValue({ ...score, score: 450 });
      prisma.trustScoreEvent.create.mockResolvedValue({});

      await service.recordEvent(USER_ID, 'DISPUTE_LOST');

      expect(prisma.trustScore.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ score: 450 }),
        }),
      );
    });

    it('DISPUTE_OPENED: sem variação de score (delta=0)', async () => {
      const score = makeTrustScore({ score: 500 });
      prisma.trustScore.findUnique.mockResolvedValue(score);
      prisma.trustScore.update.mockResolvedValue({ ...score, score: 500 });
      prisma.trustScoreEvent.create.mockResolvedValue({});

      await service.recordEvent(USER_ID, 'DISPUTE_OPENED');

      expect(prisma.trustScore.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ score: 500 }),
        }),
      );
    });

    it('score não cai abaixo de 0', async () => {
      const score = makeTrustScore({ score: 10 });
      prisma.trustScore.findUnique.mockResolvedValue(score);
      prisma.trustScore.update.mockResolvedValue({ ...score, score: 0 });
      prisma.trustScoreEvent.create.mockResolvedValue({});

      await service.recordEvent(USER_ID, 'DISPUTE_LOST');

      expect(prisma.trustScore.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ score: 0 }),
        }),
      );
    });

    it('score não ultrapassa 1000', async () => {
      const score = makeTrustScore({ score: 990 });
      prisma.trustScore.findUnique.mockResolvedValue(score);
      prisma.trustScore.update.mockResolvedValue({ ...score, score: 1000 });
      prisma.trustScoreEvent.create.mockResolvedValue({});

      await service.recordEvent(USER_ID, 'AGREEMENT_COMPLETED');

      expect(prisma.trustScore.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ score: 1000 }),
        }),
      );
    });

    it('nível é recalculado com o novo score', async () => {
      const score = makeTrustScore({ score: 580 }); // HIGH após +20 = 600
      prisma.trustScore.findUnique.mockResolvedValue(score);
      prisma.trustScore.update.mockResolvedValue({ ...score, score: 600, level: 'HIGH' });
      prisma.trustScoreEvent.create.mockResolvedValue({});

      await service.recordEvent(USER_ID, 'AGREEMENT_COMPLETED');

      expect(prisma.trustScore.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ level: 'HIGH' }),
        }),
      );
    });

    it('não falha quando usuário não tem TrustScore (retorna silenciosamente)', async () => {
      prisma.trustScore.findUnique.mockResolvedValue(null);

      await expect(service.recordEvent(USER_ID, 'AGREEMENT_COMPLETED')).resolves.toBeUndefined();
      expect(prisma.trustScore.update).not.toHaveBeenCalled();
    });

    it('cria TrustScoreEvent imutável com delta e scores corretos', async () => {
      const score = makeTrustScore({ score: 500 });
      prisma.trustScore.findUnique.mockResolvedValue(score);
      prisma.trustScore.update.mockResolvedValue({ ...score, score: 520 });
      prisma.trustScoreEvent.create.mockResolvedValue({});

      await service.recordEvent(USER_ID, 'AGREEMENT_COMPLETED', 'agr-001', 'Agreement');

      expect(prisma.trustScoreEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: USER_ID,
            type: 'AGREEMENT_COMPLETED',
            scoreBefore: 500,
            scoreDelta: 20,
            scoreAfter: 520,
          }),
        }),
      );
    });
  });
});
