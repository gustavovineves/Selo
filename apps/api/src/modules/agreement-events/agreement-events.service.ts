import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AgreementEventsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByAgreement(userId: string, agreementId: string) {
    const agreement = await this.prisma.agreement.findUnique({ where: { id: agreementId } });

    if (!agreement) return [];
    if (agreement.creatorId !== userId && agreement.counterpartId !== userId) {
      throw new ForbiddenException();
    }

    return this.prisma.agreementEvent.findMany({
      where: { agreementId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(agreementId: string, actorId: string, type: string, payload?: Record<string, unknown>) {
    return this.prisma.agreementEvent.create({
      data: { agreementId, actorId, type, payload },
    });
  }
}
