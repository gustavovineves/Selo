import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  NotImplementedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReceivingKeyDto } from './dto/create-receiving-key.dto';

// TODO: Fase 2 — implementar Chave de Recebimento do App (ReceivingKey)

@Injectable()
export class ReceivingKeysService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByUser(userId: string) {
    return this.prisma.receivingKey.findMany({
      where: { userId, status: { not: 'DELETED' } },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
  }

  create(_userId: string, _dto: CreateReceivingKeyDto) {
    // TODO: Fase 2 — validar chave no Pix antes de registrar
    throw new NotImplementedException('Receiving keys — Fase 2');
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
      data: { status: 'DELETED', deletedAt: new Date() },
    });
  }
}
