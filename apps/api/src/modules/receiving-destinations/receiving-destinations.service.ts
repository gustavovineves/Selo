import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  NotImplementedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReceivingDestinationDto } from './dto/create-receiving-destination.dto';

// TODO: Fase 2 — implementar destinos de recebimento

@Injectable()
export class ReceivingDestinationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByUser(userId: string) {
    return this.prisma.receivingDestination.findMany({
      where: { userId, status: 'ACTIVE' },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
  }

  create(_userId: string, _dto: CreateReceivingDestinationDto) {
    throw new NotImplementedException('Receiving destinations — Fase 2');
  }

  async remove(userId: string, id: string) {
    const dest = await this.prisma.receivingDestination.findUnique({ where: { id } });
    if (!dest) throw new NotFoundException('Destination not found');
    if (dest.userId !== userId) throw new ForbiddenException();

    return this.prisma.receivingDestination.update({
      where: { id },
      data: { status: 'DELETED', deletedAt: new Date() },
    });
  }
}
