import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReceivingDestinationDto } from './dto/create-receiving-destination.dto';

@Injectable()
export class ReceivingDestinationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByUser(userId: string) {
    return this.prisma.receivingDestination.findMany({
      where: { userId, active: true },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async create(userId: string, dto: CreateReceivingDestinationDto) {
    return this.prisma.receivingDestination.create({
      data: { userId, ...dto },
    });
  }

  async remove(userId: string, id: string) {
    const dest = await this.prisma.receivingDestination.findUnique({ where: { id } });
    if (!dest) throw new NotFoundException('Destination not found');
    if (dest.userId !== userId) throw new ForbiddenException();

    return this.prisma.receivingDestination.update({
      where: { id },
      data: { active: false },
    });
  }
}
