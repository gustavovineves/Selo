import { Injectable, NotFoundException, NotImplementedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TrustScoreService {
  constructor(private readonly prisma: PrismaService) {}

  async findByUser(userId: string) {
    const score = await this.prisma.trustScore.findUnique({ where: { userId } });
    if (!score) throw new NotFoundException('Trust score not found');
    return score;
  }

  recalculate(_userId: string) {
    // TODO: Fase 3 — recalcular score com base em acordos e disputas
    throw new NotImplementedException('Trust score recalculation — Fase 3');
  }
}
