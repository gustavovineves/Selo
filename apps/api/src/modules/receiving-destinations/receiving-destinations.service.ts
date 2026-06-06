import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import {
  ReceivingDestinationType,
  ReceivingDestinationStatus,
  AgreementOperationalStatus,
  AgreementFinancialStatus,
  PayoutStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReceivingDestinationDto } from './dto/create-receiving-destination.dto';
import { UpdateReceivingDestinationDto } from './dto/update-receiving-destination.dto';

const BLOCK_MESSAGE =
  'Este destino de recebimento não pode ser alterado enquanto existirem acordos ou valores pendentes.';

// Operational statuses that block destination deletion/changes
const BLOCKING_OPERATIONAL = [
  AgreementOperationalStatus.AWAITING_ACCEPTANCE,
  AgreementOperationalStatus.ACTIVE,
  AgreementOperationalStatus.AWAITING_CONFIRMATION,
];

// Financial statuses that block destination deletion/changes
const BLOCKING_FINANCIAL = [
  AgreementFinancialStatus.AWAITING_PAYMENT,
  AgreementFinancialStatus.FUNDS_HELD,
  AgreementFinancialStatus.AWAITING_PAYOUT,
  AgreementFinancialStatus.DISPUTED,
];

type DestinationRow = {
  id: string;
  type: ReceivingDestinationType;
  keyValue: string;
  nickname: string;
  status: ReceivingDestinationStatus;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class ReceivingDestinationsService {
  constructor(private readonly prisma: PrismaService) {}

  // Masks the raw key value for safe API exposure.
  // Raw keyValue is never returned in API responses.
  maskValue(type: ReceivingDestinationType, value: string): string {
    switch (type) {
      case ReceivingDestinationType.PIX_CPF: {
        const digits = value.replace(/\D/g, '');
        return `***.${digits.slice(-3)}`;
      }
      case ReceivingDestinationType.PIX_CNPJ: {
        const digits = value.replace(/\D/g, '');
        return `**.***.***/***-${digits.slice(-2)}`;
      }
      case ReceivingDestinationType.PIX_EMAIL: {
        const atIndex = value.indexOf('@');
        if (atIndex < 0) return '***@***';
        const local = value.slice(0, atIndex);
        const domain = value.slice(atIndex + 1);
        return `${local[0] ?? '*'}***@${domain}`;
      }
      case ReceivingDestinationType.PIX_PHONE: {
        const digits = value.replace(/\D/g, '');
        return `(***) ***-${digits.slice(-4)}`;
      }
      case ReceivingDestinationType.PIX_RANDOM:
      default:
        return `****-****-${value.slice(-4)}`;
    }
  }

  private toResponse(dest: DestinationRow) {
    return {
      id: dest.id,
      type: dest.type,
      maskedValue: this.maskValue(dest.type, dest.keyValue),
      label: dest.nickname,
      status: dest.status,
      isDefault: dest.isDefault,
      createdAt: dest.createdAt,
      updatedAt: dest.updatedAt,
    };
  }

  // Blocks delete/update if the user has pending agreements (as receiver) or pending payouts.
  private async assertNoPendingBlocks(userId: string, destinationId: string): Promise<void> {
    // Block if user is receiver in any agreement with blocking operational or financial status
    const blockingAgreement = await this.prisma.agreement.findFirst({
      where: {
        receiverId: userId,
        OR: [
          { operationalStatus: { in: BLOCKING_OPERATIONAL } },
          { financialStatus: { in: BLOCKING_FINANCIAL } },
        ],
      },
    });
    if (blockingAgreement) throw new ConflictException(BLOCK_MESSAGE);

    // Block if there's a pending payout directly linked to this destination
    const pendingPayout = await this.prisma.payout.findFirst({
      where: {
        recipientDestinationId: destinationId,
        status: { in: [PayoutStatus.PENDING, PayoutStatus.PROCESSING] },
      },
    });
    if (pendingPayout) throw new ConflictException(BLOCK_MESSAGE);
  }

  async create(userId: string, dto: CreateReceivingDestinationDto) {
    const activeCount = await this.prisma.receivingDestination.count({
      where: { userId, status: ReceivingDestinationStatus.ACTIVE },
    });

    // First destination becomes default automatically; explicit true also sets default
    const makeDefault = dto.isDefault === true || activeCount === 0;

    if (makeDefault) {
      await this.prisma.receivingDestination.updateMany({
        where: { userId, isDefault: true, status: ReceivingDestinationStatus.ACTIVE },
        data: { isDefault: false },
      });
    }

    const dest = await this.prisma.receivingDestination.create({
      data: {
        userId,
        type: dto.type,
        keyValue: dto.pixKey,
        nickname: dto.label ?? dto.pixKey,
        isDefault: makeDefault,
        status: ReceivingDestinationStatus.ACTIVE,
      },
    });

    return this.toResponse(dest as DestinationRow);
  }

  async findAllByUser(userId: string) {
    const destinations = await this.prisma.receivingDestination.findMany({
      where: { userId, status: ReceivingDestinationStatus.ACTIVE },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });

    return destinations.map((d) => this.toResponse(d as DestinationRow));
  }

  async update(userId: string, id: string, dto: UpdateReceivingDestinationDto) {
    const dest = await this.prisma.receivingDestination.findUnique({ where: { id } });

    if (!dest || dest.status === ReceivingDestinationStatus.DELETED) {
      throw new NotFoundException('Destino de recebimento não encontrado.');
    }
    if (dest.userId !== userId) {
      throw new ForbiddenException('Você não tem acesso a este destino.');
    }

    if (dto.isDefault === true && !dest.isDefault) {
      // Clear current default before promoting this one
      await this.prisma.receivingDestination.updateMany({
        where: { userId, isDefault: true, status: ReceivingDestinationStatus.ACTIVE },
        data: { isDefault: false },
      });
    }

    const updated = await this.prisma.receivingDestination.update({
      where: { id },
      data: {
        ...(dto.label !== undefined && { nickname: dto.label }),
        ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
      },
    });

    return this.toResponse(updated as DestinationRow);
  }

  async remove(userId: string, id: string) {
    const dest = await this.prisma.receivingDestination.findUnique({ where: { id } });

    if (!dest || dest.status === ReceivingDestinationStatus.DELETED) {
      throw new NotFoundException('Destino de recebimento não encontrado.');
    }
    if (dest.userId !== userId) {
      throw new ForbiddenException('Você não tem acesso a este destino.');
    }

    await this.assertNoPendingBlocks(userId, id);

    const updated = await this.prisma.receivingDestination.update({
      where: { id },
      data: {
        status: ReceivingDestinationStatus.DELETED,
        isDefault: false,
        deletedAt: new Date(),
      },
    });

    return this.toResponse(updated as DestinationRow);
  }

  // Returns the active default destination for a user.
  // Used by AgreementsService when creating a guaranteed agreement.
  async findActiveDefault(userId: string) {
    return this.prisma.receivingDestination.findFirst({
      where: {
        userId,
        status: ReceivingDestinationStatus.ACTIVE,
        isDefault: true,
      },
    });
  }

  // Returns any active destination when no default exists (fallback).
  async findAnyActive(userId: string) {
    return this.prisma.receivingDestination.findFirst({
      where: { userId, status: ReceivingDestinationStatus.ACTIVE },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
  }
}
