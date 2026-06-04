import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAgreementDto } from './dto/create-agreement.dto';
import { ListAgreementsDto } from './dto/list-agreements.dto';

@Injectable()
export class AgreementsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByUser(userId: string, query: ListAgreementsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = {
      OR: [{ creatorId: userId }, { counterpartId: userId }],
      ...(query.status ? { status: query.status } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.agreement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          creator: { select: { id: true, profile: { select: { displayName: true, avatarUrl: true } } } },
          counterpart: { select: { id: true, profile: { select: { displayName: true, avatarUrl: true } } } },
        },
      }),
      this.prisma.agreement.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(userId: string, id: string) {
    const agreement = await this.prisma.agreement.findUnique({
      where: { id },
      include: {
        events: { orderBy: { createdAt: 'asc' } },
        creator: { select: { id: true, profile: { select: { displayName: true, avatarUrl: true } } } },
        counterpart: { select: { id: true, profile: { select: { displayName: true, avatarUrl: true } } } },
        financialGuarantee: true,
        dispute: true,
        blockchainRecord: true,
      },
    });

    if (!agreement) throw new NotFoundException('Agreement not found');
    if (agreement.creatorId !== userId && agreement.counterpartId !== userId) {
      throw new ForbiddenException();
    }

    return agreement;
  }

  async create(creatorId: string, dto: CreateAgreementDto) {
    const agreement = await this.prisma.agreement.create({
      data: {
        title: dto.title,
        description: dto.description,
        type: dto.type ?? 'SIMPLE',
        status: dto.counterpartEmail ? 'PENDING_ACCEPTANCE' : 'DRAFT',
        creatorId,
        counterpartEmail: dto.counterpartEmail,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        amount: dto.amount,
        terms: dto.terms ?? dto.description,
        events: {
          create: { actorId: creatorId, type: 'CREATED' },
        },
      },
    });

    return agreement;
  }

  async accept(userId: string, id: string) {
    const agreement = await this.prisma.agreement.findUnique({ where: { id } });
    if (!agreement) throw new NotFoundException('Agreement not found');
    if (agreement.counterpartId !== userId) throw new ForbiddenException();
    if (agreement.status !== 'PENDING_ACCEPTANCE') {
      throw new BadRequestException('Agreement cannot be accepted in current status');
    }

    return this.prisma.agreement.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        events: { create: { actorId: userId, type: 'ACCEPTED' } },
      },
    });
  }

  async complete(userId: string, id: string) {
    const agreement = await this.prisma.agreement.findUnique({ where: { id } });
    if (!agreement) throw new NotFoundException('Agreement not found');
    if (agreement.creatorId !== userId && agreement.counterpartId !== userId) {
      throw new ForbiddenException();
    }
    if (agreement.status !== 'ACTIVE') {
      throw new BadRequestException('Only active agreements can be completed');
    }

    return this.prisma.agreement.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        events: { create: { actorId: userId, type: 'COMPLETED' } },
      },
    });
  }

  async cancel(userId: string, id: string) {
    const agreement = await this.prisma.agreement.findUnique({ where: { id } });
    if (!agreement) throw new NotFoundException('Agreement not found');
    if (agreement.creatorId !== userId) throw new ForbiddenException();

    const cancellable: string[] = ['DRAFT', 'PENDING_ACCEPTANCE', 'ACTIVE'];
    if (!cancellable.includes(agreement.status)) {
      throw new BadRequestException('Agreement cannot be cancelled in current status');
    }

    return this.prisma.agreement.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        events: { create: { actorId: userId, type: 'CANCELLED' } },
      },
    });
  }
}
