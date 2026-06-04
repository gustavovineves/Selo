import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReceivingKeyDto } from './dto/create-receiving-key.dto';

@Injectable()
export class ReceivingKeysService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByUser(userId: string) {
    return this.prisma.receivingKey.findMany({
      where: { userId, active: true },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async create(userId: string, dto: CreateReceivingKeyDto) {
    const exists = await this.prisma.receivingKey.findFirst({
      where: { userId, key: dto.key },
    });
    if (exists) throw new ConflictException('Key already registered');

    const hasDefault = await this.prisma.receivingKey.findFirst({
      where: { userId, isDefault: true },
    });

    return this.prisma.receivingKey.create({
      data: {
        userId,
        type: dto.type,
        key: dto.key,
        isDefault: !hasDefault,
      },
    });
  }

  async setDefault(userId: string, id: string) {
    const key = await this.prisma.receivingKey.findUnique({ where: { id } });
    if (!key || key.userId !== userId) throw new ForbiddenException();

    await this.prisma.receivingKey.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });

    return this.prisma.receivingKey.update({
      where: { id },
      data: { isDefault: true },
    });
  }

  async remove(userId: string, id: string) {
    const key = await this.prisma.receivingKey.findUnique({ where: { id } });
    if (!key) throw new NotFoundException('Key not found');
    if (key.userId !== userId) throw new ForbiddenException();

    return this.prisma.receivingKey.update({
      where: { id },
      data: { active: false },
    });
  }
}
