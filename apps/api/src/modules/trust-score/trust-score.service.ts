import { Injectable, NotFoundException, NotImplementedException } from '@nestjs/common';
import { TrustScoreEventType, TrustScoreLevel } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const SCORE_DELTAS: Record<TrustScoreEventType, number> = {
  INITIAL_SCORE: 0,
  AGREEMENT_COMPLETED: 20,
  AGREEMENT_CANCELLED_BY_USER: -10,
  DISPUTE_OPENED: 0,
  DISPUTE_WON: 30,
  DISPUTE_LOST: -50,
  KYC_VERIFIED: 50,
  MANUAL_ADJUSTMENT: 0,
};

function computeLevel(score: number): TrustScoreLevel {
  if (score >= 800) return TrustScoreLevel.VERY_HIGH;
  if (score >= 600) return TrustScoreLevel.HIGH;
  if (score >= 400) return TrustScoreLevel.MEDIUM;
  if (score >= 200) return TrustScoreLevel.LOW;
  return TrustScoreLevel.VERY_LOW;
}

@Injectable()
export class TrustScoreService {
  constructor(private readonly prisma: PrismaService) {}

  async findByUser(userId: string) {
    const score = await this.prisma.trustScore.findUnique({ where: { userId } });
    if (!score) throw new NotFoundException('Trust score not found');
    return score;
  }

  async recordEvent(
    userId: string,
    type: TrustScoreEventType,
    referenceId?: string,
    referenceType?: string,
    reason?: string,
    overrideDelta?: number,
  ): Promise<void> {
    const trustScore = await this.prisma.trustScore.findUnique({ where: { userId } });
    if (!trustScore) return;

    const delta = overrideDelta ?? SCORE_DELTAS[type];
    const scoreBefore = trustScore.score;
    const scoreAfter = Math.max(0, Math.min(1000, scoreBefore + delta));
    const level = computeLevel(scoreAfter);

    const countersUpdate: Record<string, unknown> = {};
    if (type === TrustScoreEventType.AGREEMENT_COMPLETED) {
      countersUpdate.completedAgreements = { increment: 1 };
    } else if (type === TrustScoreEventType.AGREEMENT_CANCELLED_BY_USER) {
      countersUpdate.canceledAgreements = { increment: 1 };
    } else if (type === TrustScoreEventType.DISPUTE_OPENED) {
      countersUpdate.disputesOpened = { increment: 1 };
    } else if (type === TrustScoreEventType.DISPUTE_WON) {
      countersUpdate.disputesWon = { increment: 1 };
    } else if (type === TrustScoreEventType.DISPUTE_LOST) {
      countersUpdate.disputesLost = { increment: 1 };
    }

    await this.prisma.$transaction([
      this.prisma.trustScore.update({
        where: { userId },
        data: {
          score: scoreAfter,
          level,
          lastCalculatedAt: new Date(),
          ...(countersUpdate as object),
        },
      }),
      this.prisma.trustScoreEvent.create({
        data: {
          userId,
          trustScoreId: trustScore.id,
          type,
          scoreBefore,
          scoreDelta: delta,
          scoreAfter,
          reason,
          referenceId,
          referenceType,
        },
      }),
    ]);
  }

  recalculate(_userId: string) {
    throw new NotImplementedException('Trust score full recalculation — Fase 6');
  }
}
