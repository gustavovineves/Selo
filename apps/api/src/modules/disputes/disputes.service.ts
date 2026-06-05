import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AddDisputeMessageDto } from './dto/add-dispute-message.dto';
import { DisputeMessageType } from '@prisma/client';

@Injectable()
export class DisputesService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(userId: string, disputeId: string) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        agreement: { select: { participants: { select: { userId: true } } } },
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!dispute) throw new NotFoundException('Disputa não encontrada.');

    const isParticipant = dispute.agreement.participants.some(
      (p) => p.userId === userId,
    );
    if (!isParticipant) throw new ForbiddenException('Você não tem acesso a esta disputa.');

    const { agreement: _agreement, ...rest } = dispute;
    return rest;
  }

  async addMessage(userId: string, disputeId: string, dto: AddDisputeMessageDto) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
      select: {
        id: true,
        status: true,
        agreement: { select: { participants: { select: { userId: true } } } },
      },
    });

    if (!dispute) throw new NotFoundException('Disputa não encontrada.');

    const isParticipant = dispute.agreement.participants.some(
      (p) => p.userId === userId,
    );
    if (!isParticipant) throw new ForbiddenException('Você não tem acesso a esta disputa.');

    if (dispute.status === 'CLOSED' || dispute.status === 'WITHDRAWN') {
      throw new BadRequestException('Esta disputa está encerrada.');
    }

    return this.prisma.disputeMessage.create({
      data: {
        disputeId,
        senderId: userId,
        senderType: 'USER',
        type: dto.type ?? DisputeMessageType.TEXT,
        content: dto.content,
      },
    });
  }
}
