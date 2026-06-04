import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import {
  AgreementType,
  AgreementMode,
  AgreementOperationalStatus,
  AgreementFinancialStatus,
  AgreementParticipantRole,
  AgreementParticipantStatus,
  AgreementEventType,
  ActorType,
  ConfirmationRule,
  ReleaseRule,
  RefundRule,
  DisputeRule,
  Prisma,
} from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSimpleAgreementDto } from './dto/create-simple-agreement.dto';
import { ListAgreementsDto } from './dto/list-agreements.dto';

// ── Participant select used in find queries ──────────────────────
const PARTICIPANT_SELECT = {
  id: true,
  userId: true,
  role: true,
  status: true,
  acceptedAt: true,
  rejectedAt: true,
  user: {
    select: {
      id: true,
      profile: {
        select: { fullName: true, displayName: true, avatarUrl: true },
      },
    },
  },
} satisfies Prisma.AgreementParticipantSelect;

@Injectable()
export class AgreementsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Private helpers ────────────────────────────────────────────

  private normalizeKey(raw: string): string {
    let key = raw.trim().toLowerCase();
    if (key.startsWith('@')) key = key.slice(1);
    return key;
  }

  private computeContentHash(data: Record<string, unknown>): string {
    return createHash('sha256').update(JSON.stringify(data)).digest('hex');
  }

  private buildSummary(
    creatorName: string,
    counterpartyName: string,
    dto: CreateSimpleAgreementDto,
  ): string {
    const parts: string[] = [
      `${creatorName} criou um combinado com ${counterpartyName}`,
    ];

    if (dto.amount) {
      const currency = dto.currency || 'BRL';
      parts.push(`no valor de ${currency} ${dto.amount.toFixed(2)}`);
    }

    if (dto.dueDate) {
      const date = new Date(dto.dueDate).toLocaleDateString('pt-BR');
      parts.push(`com prazo até ${date}`);
    }

    return parts.join(' ') + '.';
  }

  private async loadAndVerifyAccess(userId: string, id: string) {
    const agreement = await this.prisma.agreement.findUnique({
      where: { id },
      include: { participants: true },
    });

    if (!agreement) throw new NotFoundException('Acordo não encontrado.');

    const isParticipant = agreement.participants.some((p) => p.userId === userId);
    if (!isParticipant) {
      throw new ForbiddenException('Você não tem acesso a este acordo.');
    }

    return agreement;
  }

  // ── Public methods ─────────────────────────────────────────────

  async createSimple(creatorId: string, dto: CreateSimpleAgreementDto) {
    const normalized = this.normalizeKey(dto.counterpartyKey);

    const receivingKey = await this.prisma.receivingKey.findUnique({
      where: { normalizedKey: normalized },
      select: {
        userId: true,
        key: true,
        normalizedKey: true,
        status: true,
        user: {
          select: {
            id: true,
            profile: {
              select: { fullName: true, displayName: true, avatarUrl: true },
            },
          },
        },
      },
    });

    if (!receivingKey || receivingKey.status !== 'ACTIVE') {
      throw new NotFoundException('Chave da contraparte não encontrada ou inativa.');
    }

    const counterpartyId = receivingKey.userId;

    if (counterpartyId === creatorId) {
      throw new BadRequestException('Você não pode criar um acordo consigo mesmo.');
    }

    const creatorProfile = await this.prisma.userProfile.findUnique({
      where: { userId: creatorId },
      select: { fullName: true, displayName: true },
    });

    const creatorName = creatorProfile?.displayName ?? creatorProfile?.fullName ?? 'Você';
    const counterpartyProfile = receivingKey.user.profile;
    const counterpartyName =
      counterpartyProfile?.displayName ?? counterpartyProfile?.fullName ?? receivingKey.key;

    const generatedSummary = this.buildSummary(creatorName, counterpartyName, dto);

    const contentHash = this.computeContentHash({
      title: dto.title,
      description: dto.description ?? null,
      counterpartyKey: receivingKey.key,
      amount: dto.amount ?? null,
      dueDate: dto.dueDate ?? null,
      creatorId,
      counterpartyId,
    });

    const receiverKeySnapshot = {
      key: receivingKey.key,
      normalizedKey: receivingKey.normalizedKey,
      userId: receivingKey.userId,
      displayName: counterpartyProfile?.displayName ?? null,
      fullName: counterpartyProfile?.fullName ?? null,
      avatarUrl: counterpartyProfile?.avatarUrl ?? null,
    };

    const agreement = await this.prisma.$transaction(async (tx) => {
      const a = await tx.agreement.create({
        data: {
          type: AgreementType.SIMPLE,
          mode: AgreementMode.STANDARD,
          operationalStatus: AgreementOperationalStatus.AWAITING_ACCEPTANCE,
          financialStatus: AgreementFinancialStatus.NONE,
          title: dto.title,
          description: dto.description,
          generatedSummary,
          contentHash,
          amount: dto.amount !== undefined ? new Prisma.Decimal(dto.amount) : undefined,
          currency: dto.currency ?? 'BRL',
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
          acceptanceExpiresAt: dto.acceptanceExpiresAt
            ? new Date(dto.acceptanceExpiresAt)
            : undefined,
          confirmationRule: dto.confirmationRule ?? ConfirmationRule.SINGLE_PARTY,
          releaseRule: ReleaseRule.MANUAL,
          refundRule: RefundRule.MANUAL,
          disputeRule: DisputeRule.ALLOWED,
          createdById: creatorId,
          receiverId: counterpartyId,
          receiverKeySnapshot,
        },
      });

      await tx.agreementParticipant.createMany({
        data: [
          {
            agreementId: a.id,
            userId: creatorId,
            role: AgreementParticipantRole.CREATOR,
            status: AgreementParticipantStatus.ACCEPTED,
            acceptedAt: new Date(),
          },
          {
            agreementId: a.id,
            userId: counterpartyId,
            role: AgreementParticipantRole.COUNTERPART,
            status: AgreementParticipantStatus.PENDING,
          },
        ],
      });

      await tx.agreementEvent.createMany({
        data: [
          {
            agreementId: a.id,
            actorId: creatorId,
            actorType: ActorType.USER,
            type: AgreementEventType.CREATED,
            payload: { counterpartyKey: receivingKey.key } as Prisma.InputJsonValue,
          },
          {
            agreementId: a.id,
            actorId: creatorId,
            actorType: ActorType.USER,
            type: AgreementEventType.SENT,
          },
        ],
      });

      await tx.agreementStatusHistory.create({
        data: {
          agreementId: a.id,
          actorId: creatorId,
          actorType: ActorType.USER,
          newOperational: AgreementOperationalStatus.AWAITING_ACCEPTANCE,
          newFinancial: AgreementFinancialStatus.NONE,
        },
      });

      return a;
    });

    return this.findOne(creatorId, agreement.id);
  }

  async findAllByUser(userId: string, query: ListAgreementsDto) {
    const { status, type, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.AgreementWhereInput = {
      participants: { some: { userId } },
      ...(status ? { operationalStatus: status } : {}),
      ...(type ? { type } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.agreement.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          type: true,
          operationalStatus: true,
          financialStatus: true,
          title: true,
          generatedSummary: true,
          amount: true,
          currency: true,
          dueDate: true,
          acceptanceExpiresAt: true,
          confirmationRule: true,
          createdById: true,
          createdAt: true,
          updatedAt: true,
          completedAt: true,
          canceledAt: true,
          participants: {
            select: {
              id: true,
              userId: true,
              role: true,
              status: true,
            },
          },
        },
      }),
      this.prisma.agreement.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(userId: string, id: string) {
    const agreement = await this.prisma.agreement.findUnique({
      where: { id },
      include: {
        participants: { select: PARTICIPANT_SELECT },
      },
    });

    if (!agreement) throw new NotFoundException('Acordo não encontrado.');

    const isParticipant = agreement.participants.some((p) => p.userId === userId);
    if (!isParticipant) {
      throw new ForbiddenException('Você não tem acesso a este acordo.');
    }

    return agreement;
  }

  async accept(userId: string, id: string) {
    const agreement = await this.loadAndVerifyAccess(userId, id);

    if (agreement.operationalStatus !== AgreementOperationalStatus.AWAITING_ACCEPTANCE) {
      throw new BadRequestException('Este acordo não está aguardando aceite.');
    }

    const participant = agreement.participants.find(
      (p) => p.userId === userId && p.role === AgreementParticipantRole.COUNTERPART,
    );

    if (!participant) {
      throw new ForbiddenException('Somente a contraparte pode aceitar este acordo.');
    }

    if (participant.status === AgreementParticipantStatus.ACCEPTED) {
      throw new ConflictException('Este acordo já foi aceito.');
    }

    if (
      agreement.acceptanceExpiresAt &&
      agreement.acceptanceExpiresAt < new Date()
    ) {
      throw new ConflictException('O prazo de aceite deste acordo expirou.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.agreement.update({
        where: { id },
        data: { operationalStatus: AgreementOperationalStatus.ACTIVE },
      });

      await tx.agreementParticipant.update({
        where: { id: participant.id },
        data: {
          status: AgreementParticipantStatus.ACCEPTED,
          acceptedAt: new Date(),
        },
      });

      await tx.agreementEvent.create({
        data: {
          agreementId: id,
          actorId: userId,
          actorType: ActorType.USER,
          type: AgreementEventType.ACCEPTED,
        },
      });

      await tx.agreementStatusHistory.create({
        data: {
          agreementId: id,
          actorId: userId,
          actorType: ActorType.USER,
          previousOperational: AgreementOperationalStatus.AWAITING_ACCEPTANCE,
          newOperational: AgreementOperationalStatus.ACTIVE,
        },
      });
    });

    return this.findOne(userId, id);
  }

  async decline(userId: string, id: string, reason?: string) {
    const agreement = await this.loadAndVerifyAccess(userId, id);

    if (agreement.operationalStatus !== AgreementOperationalStatus.AWAITING_ACCEPTANCE) {
      throw new BadRequestException('Este acordo não pode ser recusado no estado atual.');
    }

    const participant = agreement.participants.find(
      (p) => p.userId === userId && p.role === AgreementParticipantRole.COUNTERPART,
    );

    if (!participant) {
      throw new ForbiddenException('Somente a contraparte pode recusar este acordo.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.agreement.update({
        where: { id },
        data: {
          operationalStatus: AgreementOperationalStatus.CANCELLED,
          canceledAt: new Date(),
        },
      });

      await tx.agreementParticipant.update({
        where: { id: participant.id },
        data: {
          status: AgreementParticipantStatus.REJECTED,
          rejectedAt: new Date(),
        },
      });

      await tx.agreementEvent.create({
        data: {
          agreementId: id,
          actorId: userId,
          actorType: ActorType.USER,
          type: AgreementEventType.REJECTED,
          payload: reason ? ({ reason } as Prisma.InputJsonValue) : undefined,
        },
      });

      await tx.agreementStatusHistory.create({
        data: {
          agreementId: id,
          actorId: userId,
          actorType: ActorType.USER,
          previousOperational: AgreementOperationalStatus.AWAITING_ACCEPTANCE,
          newOperational: AgreementOperationalStatus.CANCELLED,
          reason,
        },
      });
    });

    return this.findOne(userId, id);
  }

  async cancel(userId: string, id: string, reason?: string) {
    const agreement = await this.loadAndVerifyAccess(userId, id);

    const cancellable: AgreementOperationalStatus[] = [
      AgreementOperationalStatus.AWAITING_ACCEPTANCE,
      AgreementOperationalStatus.ACTIVE,
    ];

    if (!cancellable.includes(agreement.operationalStatus)) {
      throw new BadRequestException(
        'Este acordo não pode ser cancelado no estado atual.',
      );
    }

    // While awaiting acceptance, only the creator can cancel
    if (
      agreement.operationalStatus === AgreementOperationalStatus.AWAITING_ACCEPTANCE &&
      agreement.createdById !== userId
    ) {
      throw new ForbiddenException(
        'Somente o criador pode cancelar um acordo aguardando aceite.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.agreement.update({
        where: { id },
        data: {
          operationalStatus: AgreementOperationalStatus.CANCELLED,
          canceledAt: new Date(),
        },
      });

      await tx.agreementEvent.create({
        data: {
          agreementId: id,
          actorId: userId,
          actorType: ActorType.USER,
          type: AgreementEventType.CANCELLED,
          payload: reason ? ({ reason } as Prisma.InputJsonValue) : undefined,
        },
      });

      await tx.agreementStatusHistory.create({
        data: {
          agreementId: id,
          actorId: userId,
          actorType: ActorType.USER,
          previousOperational: agreement.operationalStatus,
          newOperational: AgreementOperationalStatus.CANCELLED,
          reason,
        },
      });
    });

    return this.findOne(userId, id);
  }

  async complete(userId: string, id: string) {
    const agreement = await this.loadAndVerifyAccess(userId, id);

    if (agreement.operationalStatus !== AgreementOperationalStatus.ACTIVE) {
      throw new BadRequestException('Somente acordos ativos podem ser concluídos.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.agreement.update({
        where: { id },
        data: {
          operationalStatus: AgreementOperationalStatus.COMPLETED,
          completedAt: new Date(),
        },
      });

      await tx.agreementEvent.create({
        data: {
          agreementId: id,
          actorId: userId,
          actorType: ActorType.USER,
          type: AgreementEventType.COMPLETED,
        },
      });

      await tx.agreementStatusHistory.create({
        data: {
          agreementId: id,
          actorId: userId,
          actorType: ActorType.USER,
          previousOperational: AgreementOperationalStatus.ACTIVE,
          newOperational: AgreementOperationalStatus.COMPLETED,
        },
      });
    });

    return this.findOne(userId, id);
  }
}
