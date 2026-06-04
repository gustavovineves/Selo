import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFinancialGuaranteeDto } from './dto/create-financial-guarantee.dto';

// TODO: Fase 2 — integrar com módulo de Payments para travar e liberar garantia via Pix

@Injectable()
export class FinancialGuaranteesService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(userId: string, id: string) {
    const guarantee = await this.prisma.financialGuarantee.findUnique({
      where: { id },
      include: { agreement: true },
    });
    if (!guarantee) throw new NotFoundException('Financial guarantee not found');
    if (guarantee.agreement.creatorId !== userId && guarantee.agreement.counterpartId !== userId) {
      throw new ForbiddenException();
    }
    return guarantee;
  }

  async create(userId: string, dto: CreateFinancialGuaranteeDto) {
    const agreement = await this.prisma.agreement.findUnique({ where: { id: dto.agreementId } });
    if (!agreement) throw new NotFoundException('Agreement not found');
    if (agreement.creatorId !== userId) throw new ForbiddenException();

    return this.prisma.financialGuarantee.create({
      data: {
        agreementId: dto.agreementId,
        amount: dto.amount,
        currency: dto.currency ?? 'BRL',
        status: 'PENDING',
      },
    });
  }

  async release(userId: string, id: string) {
    const guarantee = await this.findOne(userId, id);
    return this.prisma.financialGuarantee.update({
      where: { id: guarantee.id },
      data: { status: 'RELEASED', releasedAt: new Date() },
    });
  }

  async revert(userId: string, id: string) {
    const guarantee = await this.findOne(userId, id);
    return this.prisma.financialGuarantee.update({
      where: { id: guarantee.id },
      data: { status: 'REVERTED' },
    });
  }
}
