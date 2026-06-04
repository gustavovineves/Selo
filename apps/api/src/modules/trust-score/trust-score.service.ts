import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// Fórmula do score (Fase 3):
// base = 500
// +20 por acordo completado
// -50 por disputa aberta
// -100 por disputa perdida
// máx = 1000, mín = 0

@Injectable()
export class TrustScoreService {
  constructor(private readonly prisma: PrismaService) {}

  async findByUser(userId: string) {
    const score = await this.prisma.trustScore.findUnique({ where: { userId } });
    if (!score) throw new NotFoundException('Trust score not found');
    return score;
  }

  async recalculate(userId: string) {
    const [completed, disputesOpened, disputesLost] = await Promise.all([
      this.prisma.agreement.count({
        where: { status: 'COMPLETED', OR: [{ creatorId: userId }, { counterpartId: userId }] },
      }),
      this.prisma.dispute.count({ where: { openedById: userId } }),
      this.prisma.dispute.count({
        where: {
          openedById: userId,
          status: { in: ['RESOLVED_FAVOR_COUNTERPART'] },
        },
      }),
    ]);

    const total = await this.prisma.agreement.count({
      where: { OR: [{ creatorId: userId }, { counterpartId: userId }] },
    });

    const score = Math.min(
      1000,
      Math.max(0, 500 + completed * 20 - disputesOpened * 50 - disputesLost * 100),
    );

    return this.prisma.trustScore.upsert({
      where: { userId },
      create: { userId, score, totalAgreements: total, completedAgreements: completed, disputesOpened, disputesLost },
      update: { score, totalAgreements: total, completedAgreements: completed, disputesOpened, disputesLost, lastCalculatedAt: new Date() },
    });
  }
}
