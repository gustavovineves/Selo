import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';

@Injectable()
export class DisputesService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(userId: string, id: string) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id },
      include: { agreement: true },
    });
    if (!dispute) throw new NotFoundException('Dispute not found');
    if (
      dispute.agreement.creatorId !== userId &&
      dispute.agreement.counterpartId !== userId
    ) {
      throw new ForbiddenException();
    }
    return dispute;
  }

  async create(userId: string, dto: CreateDisputeDto) {
    const agreement = await this.prisma.agreement.findUnique({
      where: { id: dto.agreementId },
    });
    if (!agreement) throw new NotFoundException('Agreement not found');
    if (agreement.creatorId !== userId && agreement.counterpartId !== userId) {
      throw new ForbiddenException();
    }

    const existing = await this.prisma.dispute.findUnique({
      where: { agreementId: dto.agreementId },
    });
    if (existing) throw new ConflictException('Dispute already exists for this agreement');

    const [dispute] = await this.prisma.$transaction([
      this.prisma.dispute.create({
        data: {
          agreementId: dto.agreementId,
          openedById: userId,
          reason: dto.reason,
          description: dto.description,
          status: 'OPEN',
        },
      }),
      this.prisma.agreement.update({
        where: { id: dto.agreementId },
        data: {
          status: 'DISPUTED',
          events: { create: { actorId: userId, type: 'DISPUTED' } },
        },
      }),
    ]);

    return dispute;
  }

  async resolve(userId: string, id: string, dto: ResolveDisputeDto) {
    // TODO: Fase 3 — apenas admins devem poder resolver disputas
    const dispute = await this.findOne(userId, id);
    return this.prisma.dispute.update({
      where: { id: dispute.id },
      data: {
        status: dto.status,
        resolution: dto.resolution,
        resolvedAt: new Date(),
      },
    });
  }
}
