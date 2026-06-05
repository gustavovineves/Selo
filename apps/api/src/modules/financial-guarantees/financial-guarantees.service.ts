import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FinancialGuaranteesService {
  constructor(private readonly prisma: PrismaService) {}

  async findByAgreement(userId: string, agreementId: string) {
    const agreement = await this.prisma.agreement.findUnique({
      where: { id: agreementId },
      select: {
        participants: { select: { userId: true } },
        financialGuarantee: {
          select: {
            id: true,
            amount: true,
            currency: true,
            status: true,
            lockedAt: true,
            releasedAt: true,
            revertedAt: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!agreement) throw new NotFoundException('Acordo não encontrado.');

    const isParticipant = agreement.participants.some((p) => p.userId === userId);
    if (!isParticipant) throw new ForbiddenException('Você não tem acesso a este acordo.');

    if (!agreement.financialGuarantee) {
      throw new NotFoundException('Este acordo não possui garantia financeira.');
    }

    return agreement.financialGuarantee;
  }

  async findById(userId: string, id: string) {
    const guarantee = await this.prisma.financialGuarantee.findUnique({
      where: { id },
      include: {
        agreement: {
          select: { participants: { select: { userId: true } } },
        },
      },
    });

    if (!guarantee) throw new NotFoundException('Garantia não encontrada.');

    const isParticipant = guarantee.agreement.participants.some(
      (p) => p.userId === userId,
    );
    if (!isParticipant) throw new ForbiddenException('Você não tem acesso a esta garantia.');

    const { agreement: _agreement, ...rest } = guarantee;
    return rest;
  }
}
