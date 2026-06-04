import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AgreementEventsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByAgreement(userId: string, agreementId: string) {
    const agreement = await this.prisma.agreement.findUnique({
      where: { id: agreementId },
      select: { participants: { select: { userId: true } } },
    });

    if (!agreement) throw new NotFoundException('Acordo não encontrado.');

    const isParticipant = agreement.participants.some((p) => p.userId === userId);
    if (!isParticipant) {
      throw new ForbiddenException('Você não tem acesso a este acordo.');
    }

    return this.prisma.agreementEvent.findMany({
      where: { agreementId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        agreementId: true,
        actorId: true,
        actorType: true,
        type: true,
        payload: true,
        note: true,
        createdAt: true,
      },
    });
  }
}
