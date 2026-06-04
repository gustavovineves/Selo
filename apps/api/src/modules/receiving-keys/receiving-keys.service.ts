import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import {
  AgreementOperationalStatus,
  DisputeStatus,
  PaymentIntentStatus,
  PayoutStatus,
  ReceivingKeyType,
  RefundStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReceivingKeyDto } from './dto/create-receiving-key.dto';

const RESERVED_HANDLES = new Set([
  'admin',
  'suporte',
  'support',
  'selo',
  'system',
  'root',
  'api',
  'auth',
  'pix',
  'fitbank',
  'null',
  'undefined',
  'deleted',
  'me',
]);

const HANDLE_REGEX = /^[a-z0-9._-]+$/;

@Injectable()
export class ReceivingKeysService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeKey(raw: string): string {
    let key = raw.trim().toLowerCase();
    if (key.startsWith('@')) key = key.slice(1);
    return key;
  }

  private validateHandle(normalized: string): void {
    if (normalized.length < 3) {
      throw new BadRequestException('Handle deve ter no mínimo 3 caracteres.');
    }
    if (normalized.length > 30) {
      throw new BadRequestException('Handle deve ter no máximo 30 caracteres.');
    }
    if (!HANDLE_REGEX.test(normalized)) {
      throw new BadRequestException(
        'Handle só pode conter letras, números, ponto, underline ou hífen.',
      );
    }
    if (RESERVED_HANDLES.has(normalized)) {
      throw new BadRequestException('Este handle é reservado e não pode ser usado.');
    }
  }

  private async assertNoPendingBlocks(userId: string): Promise<void> {
    const BLOCK_MESSAGE =
      'Esta chave não pode ser excluída enquanto existirem acordos, pagamentos ou disputas pendentes.';

    const activeAgreement = await this.prisma.agreement.findFirst({
      where: {
        OR: [
          { createdById: userId },
          { payerId: userId },
          { receiverId: userId },
        ],
        operationalStatus: {
          in: [
            AgreementOperationalStatus.AWAITING_ACCEPTANCE,
            AgreementOperationalStatus.ACTIVE,
            AgreementOperationalStatus.AWAITING_CONFIRMATION,
          ],
        },
      },
    });
    if (activeAgreement) throw new ConflictException(BLOCK_MESSAGE);

    const pendingPayment = await this.prisma.paymentIntent.findFirst({
      where: {
        payerId: userId,
        status: { in: [PaymentIntentStatus.PENDING, PaymentIntentStatus.AWAITING_PAYMENT] },
      },
    });
    if (pendingPayment) throw new ConflictException(BLOCK_MESSAGE);

    const pendingPayout = await this.prisma.payout.findFirst({
      where: {
        recipientId: userId,
        status: { in: [PayoutStatus.PENDING, PayoutStatus.PROCESSING] },
      },
    });
    if (pendingPayout) throw new ConflictException(BLOCK_MESSAGE);

    const pendingRefund = await this.prisma.refund.findFirst({
      where: {
        recipientId: userId,
        status: { in: [RefundStatus.PENDING, RefundStatus.PROCESSING] },
      },
    });
    if (pendingRefund) throw new ConflictException(BLOCK_MESSAGE);

    const openDispute = await this.prisma.dispute.findFirst({
      where: {
        openedById: userId,
        status: {
          in: [DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW, DisputeStatus.AWAITING_EVIDENCE],
        },
      },
    });
    if (openDispute) throw new ConflictException(BLOCK_MESSAGE);
  }

  async create(userId: string, dto: CreateReceivingKeyDto) {
    const normalized = this.normalizeKey(dto.key);
    this.validateHandle(normalized);

    const existingActive = await this.prisma.receivingKey.findFirst({
      where: { userId, status: 'ACTIVE' },
    });
    if (existingActive) {
      throw new ConflictException(
        'Você já tem uma chave ativa. Exclua-a antes de criar uma nova.',
      );
    }

    const existingNormalized = await this.prisma.receivingKey.findUnique({
      where: { normalizedKey: normalized },
    });
    if (existingNormalized) {
      throw new ConflictException('Este handle já está em uso.');
    }

    return this.prisma.receivingKey.create({
      data: {
        userId,
        type: ReceivingKeyType.RANDOM, // handles internos usam RANDOM no MVP
        key: '@' + normalized,
        normalizedKey: normalized,
        status: 'ACTIVE',
        isDefault: true,
      },
      select: {
        id: true,
        key: true,
        normalizedKey: true,
        status: true,
        isDefault: true,
        createdAt: true,
      },
    });
  }

  async findActive(userId: string) {
    const key = await this.prisma.receivingKey.findFirst({
      where: { userId, status: 'ACTIVE' },
      select: {
        id: true,
        key: true,
        normalizedKey: true,
        status: true,
        isDefault: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!key) throw new NotFoundException('Nenhuma chave ativa encontrada.');
    return key;
  }

  async findHistory(userId: string) {
    return this.prisma.receivingKey.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        key: true,
        normalizedKey: true,
        status: true,
        isDefault: true,
        deletedAt: true,
        createdAt: true,
      },
    });
  }

  async checkAvailability(key: string) {
    const normalized = this.normalizeKey(key);

    const isValidFormat =
      HANDLE_REGEX.test(normalized) &&
      normalized.length >= 3 &&
      normalized.length <= 30;

    if (!isValidFormat) return { available: false, reason: 'invalid_format' };
    if (RESERVED_HANDLES.has(normalized)) return { available: false, reason: 'reserved' };

    const existing = await this.prisma.receivingKey.findUnique({
      where: { normalizedKey: normalized },
    });
    return { available: !existing };
  }

  async resolve(key: string) {
    const normalized = this.normalizeKey(key);

    const receivingKey = await this.prisma.receivingKey.findUnique({
      where: { normalizedKey: normalized },
      select: {
        userId: true,
        key: true,
        status: true,
        user: {
          select: {
            profile: {
              select: {
                fullName: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    if (!receivingKey || receivingKey.status !== 'ACTIVE') {
      throw new NotFoundException('Chave não encontrada ou indisponível.');
    }

    const profile = receivingKey.user.profile;

    return {
      userId: receivingKey.userId,
      displayName: profile?.displayName ?? profile?.fullName ?? null,
      avatarUrl: profile?.avatarUrl ?? null,
      key: receivingKey.key,
      canReceiveAgreements: true,
    };
  }

  async remove(userId: string) {
    const key = await this.prisma.receivingKey.findFirst({
      where: { userId, status: 'ACTIVE' },
    });
    if (!key) throw new NotFoundException('Nenhuma chave ativa encontrada.');

    await this.assertNoPendingBlocks(userId);

    return this.prisma.receivingKey.update({
      where: { id: key.id },
      data: {
        status: 'DELETED',
        deletedAt: new Date(),
        isDefault: false,
      },
      select: {
        id: true,
        key: true,
        normalizedKey: true,
        status: true,
        deletedAt: true,
      },
    });
  }
}
