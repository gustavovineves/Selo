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
  FinancialGuaranteeStatus,
  PaymentIntentStatus,
  PixChargeStatus,
  PayoutStatus,
  RefundStatus,
  TrustScoreEventType,
  AuditAction,
  ReceivingKeyType,
  Prisma,
} from '@prisma/client';
import { createHash, randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { TrustScoreService } from '../trust-score/trust-score.service';
import { BlockchainRecordsService } from '../blockchain-records/blockchain-records.service';
import { CreateSimpleAgreementDto } from './dto/create-simple-agreement.dto';
import { CreateGuaranteedAgreementDto } from './dto/create-guaranteed-agreement.dto';
import { ListAgreementsDto } from './dto/list-agreements.dto';
import { OpenDisputeDto } from './dto/open-dispute.dto';

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

const GUARANTEE_SUMMARY_SELECT = {
  id: true,
  amount: true,
  currency: true,
  status: true,
  lockedAt: true,
  releasedAt: true,
  revertedAt: true,
  createdAt: true,
} satisfies Prisma.FinancialGuaranteeSelect;

const DISPUTE_SUMMARY_SELECT = {
  id: true,
  status: true,
  reason: true,
  openedById: true,
  createdAt: true,
} satisfies Prisma.DisputeSelect;

// Status de disputa que bloqueiam o release
const BLOCKING_DISPUTE_STATUSES = new Set(['OPEN', 'UNDER_REVIEW', 'AWAITING_EVIDENCE']);

@Injectable()
export class AgreementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
    private readonly trustScore: TrustScoreService,
    private readonly blockchainRecords: BlockchainRecordsService,
  ) {}

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
    amount?: number,
    currency?: string,
    dueDate?: string,
    isGuaranteed = false,
  ): string {
    const parts: string[] = [
      `${creatorName} criou um combinado com ${counterpartyName}`,
    ];

    if (amount) {
      const cur = currency || 'BRL';
      const label = isGuaranteed ? 'com garantia de' : 'no valor de';
      parts.push(`${label} ${cur} ${amount.toFixed(2)}`);
    }

    if (dueDate) {
      const date = new Date(dueDate).toLocaleDateString('pt-BR');
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

  private async resolveCounterparty(normalizedKey: string) {
    const receivingKey = await this.prisma.receivingKey.findUnique({
      where: { normalizedKey },
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
      throw new NotFoundException(
        'Chave da contraparte não encontrada ou inativa.',
      );
    }

    return receivingKey;
  }

  // ── Public methods ─────────────────────────────────────────────

  async createSimple(creatorId: string, dto: CreateSimpleAgreementDto) {
    const normalized = this.normalizeKey(dto.counterpartyKey);
    const receivingKey = await this.resolveCounterparty(normalized);
    const counterpartyId = receivingKey.userId;

    if (counterpartyId === creatorId) {
      throw new BadRequestException('Você não pode criar um acordo consigo mesmo.');
    }

    const creatorProfile = await this.prisma.userProfile.findUnique({
      where: { userId: creatorId },
      select: { fullName: true, displayName: true },
    });

    const creatorName =
      creatorProfile?.displayName ?? creatorProfile?.fullName ?? 'Você';
    const counterpartyProfile = receivingKey.user.profile;
    const counterpartyName =
      counterpartyProfile?.displayName ??
      counterpartyProfile?.fullName ??
      receivingKey.key;

    const generatedSummary = this.buildSummary(
      creatorName,
      counterpartyName,
      dto.amount,
      dto.currency,
      dto.dueDate,
    );

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
          amount:
            dto.amount !== undefined
              ? new Prisma.Decimal(dto.amount)
              : undefined,
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
            payload: {
              counterpartyKey: receivingKey.key,
            } as Prisma.InputJsonValue,
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

  async createGuaranteed(creatorId: string, dto: CreateGuaranteedAgreementDto) {
    const normalized = this.normalizeKey(dto.counterpartyKey);
    const receivingKey = await this.resolveCounterparty(normalized);
    const counterpartyId = receivingKey.userId;

    if (counterpartyId === creatorId) {
      throw new BadRequestException('Você não pode criar um acordo consigo mesmo.');
    }

    const creatorProfile = await this.prisma.userProfile.findUnique({
      where: { userId: creatorId },
      select: { fullName: true, displayName: true },
    });

    const creatorName =
      creatorProfile?.displayName ?? creatorProfile?.fullName ?? 'Você';
    const counterpartyProfile = receivingKey.user.profile;
    const counterpartyName =
      counterpartyProfile?.displayName ??
      counterpartyProfile?.fullName ??
      receivingKey.key;

    const generatedSummary = this.buildSummary(
      creatorName,
      counterpartyName,
      dto.amount,
      dto.currency,
      dto.dueDate,
      true,
    );

    const contentHash = this.computeContentHash({
      title: dto.title,
      description: dto.description ?? null,
      counterpartyKey: receivingKey.key,
      amount: dto.amount,
      dueDate: dto.dueDate ?? null,
      creatorId,
      counterpartyId,
      type: 'WITH_GUARANTEE',
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
          type: AgreementType.WITH_GUARANTEE,
          mode: AgreementMode.STANDARD,
          operationalStatus: AgreementOperationalStatus.AWAITING_ACCEPTANCE,
          financialStatus: AgreementFinancialStatus.AWAITING_PAYMENT,
          title: dto.title,
          description: dto.description,
          generatedSummary,
          contentHash,
          amount: new Prisma.Decimal(dto.amount),
          currency: dto.currency ?? 'BRL',
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
          acceptanceExpiresAt: dto.acceptanceExpiresAt
            ? new Date(dto.acceptanceExpiresAt)
            : undefined,
          confirmationDeadlineAt: dto.confirmationDeadlineAt
            ? new Date(dto.confirmationDeadlineAt)
            : undefined,
          confirmationRule: dto.confirmationRule ?? ConfirmationRule.MANUAL,
          releaseRule: dto.releaseRule ?? ReleaseRule.MANUAL,
          refundRule: dto.refundRule ?? RefundRule.MANUAL,
          disputeRule: dto.disputeRule ?? DisputeRule.ALLOWED,
          createdById: creatorId,
          payerId: creatorId,
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

      await tx.financialGuarantee.create({
        data: {
          agreementId: a.id,
          amount: new Prisma.Decimal(dto.amount),
          currency: dto.currency ?? 'BRL',
          status: FinancialGuaranteeStatus.AWAITING_PAYMENT,
        },
      });

      await tx.agreementEvent.createMany({
        data: [
          {
            agreementId: a.id,
            actorId: creatorId,
            actorType: ActorType.USER,
            type: AgreementEventType.CREATED,
            payload: {
              counterpartyKey: receivingKey.key,
              amount: dto.amount,
              currency: dto.currency ?? 'BRL',
            } as Prisma.InputJsonValue,
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
          newFinancial: AgreementFinancialStatus.AWAITING_PAYMENT,
        },
      });

      return a;
    });

    await this.auditLogs.log({
      userId: creatorId,
      action: AuditAction.AGREEMENT_CREATED,
      resource: 'Agreement',
      resourceId: agreement.id,
      newData: { type: 'WITH_GUARANTEE', amount: dto.amount },
    });

    return this.findOne(creatorId, agreement.id);
  }

  async initiatePayment(userId: string, agreementId: string) {
    const agreement = await this.prisma.agreement.findUnique({
      where: { id: agreementId },
      include: {
        participants: true,
        financialGuarantee: true,
      },
    });

    if (!agreement) throw new NotFoundException('Acordo não encontrado.');

    const isParticipant = agreement.participants.some((p) => p.userId === userId);
    if (!isParticipant) throw new ForbiddenException('Você não tem acesso a este acordo.');

    if (agreement.type !== AgreementType.WITH_GUARANTEE) {
      throw new BadRequestException('Este acordo não exige garantia financeira.');
    }

    if (agreement.operationalStatus !== AgreementOperationalStatus.ACTIVE) {
      throw new BadRequestException(
        'O acordo precisa estar ativo (aceito pela contraparte) para iniciar o pagamento.',
      );
    }

    if (agreement.financialStatus !== AgreementFinancialStatus.AWAITING_PAYMENT) {
      throw new BadRequestException(
        'Este acordo não está aguardando pagamento.',
      );
    }

    // Only the payer (creator in MVP) initiates payment
    if (agreement.payerId && agreement.payerId !== userId) {
      throw new ForbiddenException('Somente o pagador pode iniciar o depósito da garantia.');
    }

    const guarantee = agreement.financialGuarantee;
    if (!guarantee) throw new BadRequestException('Garantia financeira não encontrada.');

    // Check no active non-terminal PaymentIntent
    const existingActive = await this.prisma.paymentIntent.findFirst({
      where: {
        financialGuaranteeId: guarantee.id,
        status: {
          in: [PaymentIntentStatus.PENDING, PaymentIntentStatus.AWAITING_PAYMENT],
        },
      },
    });

    if (existingActive) {
      throw new ConflictException(
        'Já existe um pagamento em andamento para este acordo.',
      );
    }

    const idempotencyKey = randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 60 * 1000); // 30 min

    // Simulated platform Pix key (real integration: BaaS/Fitbank key)
    const platformPixKey = 'SELO-PLATFORM@DEV.LOCAL';
    const simulatedTxid = randomUUID().replace(/-/g, '').slice(0, 35);
    const simulatedQrCode = [
      '00020126360014br.gov.bcb.pix0114SELO-PLATFORM',
      `@DEV52040000530398654${String(guarantee.amount).padStart(10, '0')}`,
      '5802BR5913SELO PLATFORM6009SAO PAULO63044A1B',
    ].join('');

    const result = await this.prisma.$transaction(async (tx) => {
      const paymentIntent = await tx.paymentIntent.create({
        data: {
          agreementId,
          financialGuaranteeId: guarantee.id,
          payerId: userId,
          amount: guarantee.amount,
          currency: guarantee.currency,
          status: PaymentIntentStatus.AWAITING_PAYMENT,
          idempotencyKey,
          expiresAt,
          metadata: { provider: 'SIMULATED', environment: 'dev' } as Prisma.InputJsonValue,
        },
      });

      await tx.pixCharge.create({
        data: {
          paymentIntentId: paymentIntent.id,
          txid: simulatedTxid,
          pixKey: platformPixKey,
          pixKeyType: ReceivingKeyType.RANDOM,
          qrCode: simulatedQrCode,
          amount: guarantee.amount,
          status: PixChargeStatus.ACTIVE,
          expiresAt,
          rawRequest: { simulated: true, agreementId } as Prisma.InputJsonValue,
          rawResponse: { txid: simulatedTxid, status: 'ACTIVE' } as Prisma.InputJsonValue,
        },
      });

      await tx.agreementEvent.create({
        data: {
          agreementId,
          actorId: userId,
          actorType: ActorType.USER,
          type: AgreementEventType.PAYMENT_REQUESTED,
          payload: {
            paymentIntentId: paymentIntent.id,
            amount: guarantee.amount.toString(),
            currency: guarantee.currency,
          } as Prisma.InputJsonValue,
        },
      });

      return paymentIntent;
    });

    await this.auditLogs.log({
      userId,
      action: AuditAction.PAYMENT_INITIATED,
      resource: 'PaymentIntent',
      resourceId: result.id,
      newData: { agreementId, amount: guarantee.amount.toString() },
    });

    return this.prisma.paymentIntent.findUnique({
      where: { id: result.id },
      include: {
        pixCharge: {
          select: {
            id: true,
            txid: true,
            pixKey: true,
            qrCode: true,
            amount: true,
            status: true,
            expiresAt: true,
          },
        },
      },
    });
  }

  async release(userId: string, agreementId: string) {
    const agreement = await this.prisma.agreement.findUnique({
      where: { id: agreementId },
      include: {
        participants: true,
        financialGuarantee: true,
        dispute: { select: { id: true, status: true } },
      },
    });

    if (!agreement) throw new NotFoundException('Acordo não encontrado.');

    const isParticipant = agreement.participants.some((p) => p.userId === userId);
    if (!isParticipant) throw new ForbiddenException('Você não tem acesso a este acordo.');

    if (agreement.type !== AgreementType.WITH_GUARANTEE) {
      throw new BadRequestException('Apenas acordos com garantia podem ter o valor liberado.');
    }

    if (
      agreement.dispute &&
      BLOCKING_DISPUTE_STATUSES.has(agreement.dispute.status)
    ) {
      throw new ConflictException(
        'Existe uma disputa em aberto. Resolva a disputa antes de liberar o valor.',
      );
    }

    if (agreement.financialStatus !== AgreementFinancialStatus.FUNDS_HELD) {
      throw new BadRequestException(
        'O valor precisa estar protegido para ser liberado.',
      );
    }

    // MANUAL confirmationRule requires both parties to confirm first
    if (agreement.confirmationRule === ConfirmationRule.MANUAL) {
      const confirmedEvents = await this.prisma.agreementEvent.findMany({
        where: { agreementId, type: AgreementEventType.CONFIRMED },
        select: { actorId: true },
      });

      const participantIds = agreement.participants
        .map((p) => p.userId)
        .filter((id): id is string => id !== null);

      const confirmedIds = new Set(
        confirmedEvents
          .map((e) => e.actorId)
          .filter((id): id is string => id !== null && participantIds.includes(id)),
      );

      const allConfirmed = participantIds.every((id) => confirmedIds.has(id));

      if (!allConfirmed) {
        throw new BadRequestException(
          'Este acordo exige confirmação das duas partes antes da liberação. Use o endpoint /confirm-completion.',
        );
      }
    }

    const guarantee = agreement.financialGuarantee!;

    // Find receiver's active ReceivingKey for snapshot
    const receiverKey = await this.prisma.receivingKey.findFirst({
      where: { userId: agreement.receiverId!, status: 'ACTIVE' },
    });

    const destinationSnapshot = receiverKey
      ? { key: receiverKey.key, normalizedKey: receiverKey.normalizedKey }
      : (agreement.receiverKeySnapshot as object | null) ?? {};

    const idempotencyKey = randomUUID();
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      const payout = await tx.payout.create({
        data: {
          agreementId,
          financialGuaranteeId: guarantee.id,
          recipientId: agreement.receiverId!,
          recipientKeyId: receiverKey?.id ?? null,
          destinationSnapshot: destinationSnapshot as Prisma.InputJsonValue,
          amount: guarantee.amount,
          currency: guarantee.currency,
          status: PayoutStatus.COMPLETED,
          idempotencyKey,
          initiatedAt: now,
          completedAt: now,
          metadata: { simulated: true } as Prisma.InputJsonValue,
        },
      });

      await tx.financialGuarantee.update({
        where: { id: guarantee.id },
        data: {
          status: FinancialGuaranteeStatus.PAID_OUT,
          releasedAt: now,
        },
      });

      await tx.agreement.update({
        where: { id: agreementId },
        data: {
          financialStatus: AgreementFinancialStatus.PAID_OUT,
          operationalStatus: AgreementOperationalStatus.COMPLETED,
          completedAt: now,
        },
      });

      await tx.agreementEvent.createMany({
        data: [
          {
            agreementId,
            actorId: userId,
            actorType: ActorType.USER,
            type: AgreementEventType.PAYOUT_INITIATED,
            payload: { payoutId: payout.id } as Prisma.InputJsonValue,
          },
          {
            agreementId,
            actorId: userId,
            actorType: ActorType.USER,
            type: AgreementEventType.PAYOUT_COMPLETED,
            payload: {
              payoutId: payout.id,
              amount: guarantee.amount.toString(),
              currency: guarantee.currency,
            } as Prisma.InputJsonValue,
          },
          {
            agreementId,
            actorId: userId,
            actorType: ActorType.USER,
            type: AgreementEventType.COMPLETED,
          },
        ],
      });

      await tx.agreementStatusHistory.create({
        data: {
          agreementId,
          actorId: userId,
          actorType: ActorType.USER,
          previousOperational: AgreementOperationalStatus.ACTIVE,
          newOperational: AgreementOperationalStatus.COMPLETED,
          previousFinancial: AgreementFinancialStatus.FUNDS_HELD,
          newFinancial: AgreementFinancialStatus.PAID_OUT,
        },
      });
    });

    await this.auditLogs.log({
      userId,
      action: AuditAction.PAYOUT_COMPLETED,
      resource: 'Agreement',
      resourceId: agreementId,
      newData: { amount: guarantee.amount.toString() },
    });

    // Trust score: +20 for both participants
    for (const p of agreement.participants) {
      if (p.userId) {
        await this.trustScore.recordEvent(
          p.userId,
          TrustScoreEventType.AGREEMENT_COMPLETED,
          agreementId,
          'Agreement',
          'Acordo com garantia concluído',
        );
      }
    }

    await this.blockchainRecords.createPending(agreementId, {
      event: 'PAYOUT_COMPLETED',
      agreementId,
      amount: guarantee.amount.toString(),
      currency: guarantee.currency,
      timestamp: now.toISOString(),
    });

    return this.findOne(userId, agreementId);
  }

  async confirmCompletion(userId: string, agreementId: string) {
    const agreement = await this.prisma.agreement.findUnique({
      where: { id: agreementId },
      include: {
        participants: true,
        financialGuarantee: true,
        dispute: { select: { id: true, status: true } },
      },
    });

    if (!agreement) throw new NotFoundException('Acordo não encontrado.');

    const isParticipant = agreement.participants.some((p) => p.userId === userId);
    if (!isParticipant) throw new ForbiddenException('Você não tem acesso a este acordo.');

    if (agreement.type !== AgreementType.WITH_GUARANTEE) {
      throw new BadRequestException(
        'Confirmação de conclusão é exclusiva para acordos com garantia. Use /complete para acordos simples.',
      );
    }

    const confirmable: AgreementOperationalStatus[] = [
      AgreementOperationalStatus.ACTIVE,
      AgreementOperationalStatus.AWAITING_CONFIRMATION,
    ];

    if (!confirmable.includes(agreement.operationalStatus)) {
      throw new BadRequestException('Este acordo não pode ser confirmado no estado atual.');
    }

    if (
      agreement.dispute &&
      BLOCKING_DISPUTE_STATUSES.has(agreement.dispute.status)
    ) {
      throw new ConflictException(
        'Existe uma disputa em aberto. Resolva a disputa antes de confirmar a conclusão.',
      );
    }

    if (agreement.financialStatus !== AgreementFinancialStatus.FUNDS_HELD) {
      throw new BadRequestException('O valor precisa estar protegido para confirmar a conclusão.');
    }

    // Idempotency: block duplicate confirmation from same user
    const existingConfirmation = await this.prisma.agreementEvent.findFirst({
      where: { agreementId, actorId: userId, type: AgreementEventType.CONFIRMED },
    });

    if (existingConfirmation) {
      throw new ConflictException('Você já confirmou a conclusão deste acordo.');
    }

    // Gather all existing confirmations from participants
    const existingConfirmations = await this.prisma.agreementEvent.findMany({
      where: { agreementId, type: AgreementEventType.CONFIRMED },
      select: { actorId: true },
    });

    const participantIds = agreement.participants
      .map((p) => p.userId)
      .filter((id): id is string => id !== null);

    const confirmedIds = new Set(
      existingConfirmations
        .map((e) => e.actorId)
        .filter((id): id is string => id !== null && participantIds.includes(id)),
    );
    confirmedIds.add(userId);

    const allConfirmed = participantIds.every((id) => confirmedIds.has(id));
    const now = new Date();

    if (!allConfirmed) {
      // First confirmation — transition to AWAITING_CONFIRMATION
      await this.prisma.$transaction(async (tx) => {
        await tx.agreementEvent.create({
          data: {
            agreementId,
            actorId: userId,
            actorType: ActorType.USER,
            type: AgreementEventType.CONFIRMED,
            payload: {
              confirmedBy: userId,
              confirmedCount: confirmedIds.size,
              requiredCount: participantIds.length,
            } as Prisma.InputJsonValue,
          },
        });

        if (agreement.operationalStatus === AgreementOperationalStatus.ACTIVE) {
          await tx.agreement.update({
            where: { id: agreementId },
            data: { operationalStatus: AgreementOperationalStatus.AWAITING_CONFIRMATION },
          });

          await tx.agreementEvent.create({
            data: {
              agreementId,
              actorId: null,
              actorType: ActorType.SYSTEM,
              type: AgreementEventType.CONFIRMATION_REQUESTED,
              payload: {
                triggeredBy: userId,
                waitingFor: participantIds.filter((id) => !confirmedIds.has(id)),
              } as Prisma.InputJsonValue,
            },
          });

          await tx.agreementStatusHistory.create({
            data: {
              agreementId,
              actorId: userId,
              actorType: ActorType.USER,
              previousOperational: AgreementOperationalStatus.ACTIVE,
              newOperational: AgreementOperationalStatus.AWAITING_CONFIRMATION,
            },
          });
        }
      });

      return this.findOne(userId, agreementId);
    }

    // Both parties confirmed — auto-release the value
    const guarantee = agreement.financialGuarantee!;

    const receiverKey = await this.prisma.receivingKey.findFirst({
      where: { userId: agreement.receiverId!, status: 'ACTIVE' },
    });

    const destinationSnapshot = receiverKey
      ? { key: receiverKey.key, normalizedKey: receiverKey.normalizedKey }
      : (agreement.receiverKeySnapshot as object | null) ?? {};

    const idempotencyKey = randomUUID();

    await this.prisma.$transaction(async (tx) => {
      await tx.agreementEvent.create({
        data: {
          agreementId,
          actorId: userId,
          actorType: ActorType.USER,
          type: AgreementEventType.CONFIRMED,
          payload: {
            confirmedBy: userId,
            confirmedCount: confirmedIds.size,
            requiredCount: participantIds.length,
          } as Prisma.InputJsonValue,
        },
      });

      const payout = await tx.payout.create({
        data: {
          agreementId,
          financialGuaranteeId: guarantee.id,
          recipientId: agreement.receiverId!,
          recipientKeyId: receiverKey?.id ?? null,
          destinationSnapshot: destinationSnapshot as Prisma.InputJsonValue,
          amount: guarantee.amount,
          currency: guarantee.currency,
          status: PayoutStatus.COMPLETED,
          idempotencyKey,
          initiatedAt: now,
          completedAt: now,
          metadata: { simulated: true, triggeredBy: 'dual_confirmation' } as Prisma.InputJsonValue,
        },
      });

      await tx.financialGuarantee.update({
        where: { id: guarantee.id },
        data: { status: FinancialGuaranteeStatus.PAID_OUT, releasedAt: now },
      });

      await tx.agreement.update({
        where: { id: agreementId },
        data: {
          financialStatus: AgreementFinancialStatus.PAID_OUT,
          operationalStatus: AgreementOperationalStatus.COMPLETED,
          completedAt: now,
        },
      });

      await tx.agreementEvent.createMany({
        data: [
          {
            agreementId,
            actorId: null,
            actorType: ActorType.SYSTEM,
            type: AgreementEventType.PAYOUT_INITIATED,
            payload: { payoutId: payout.id, triggeredBy: 'dual_confirmation' } as Prisma.InputJsonValue,
          },
          {
            agreementId,
            actorId: null,
            actorType: ActorType.SYSTEM,
            type: AgreementEventType.PAYOUT_COMPLETED,
            payload: {
              payoutId: payout.id,
              amount: guarantee.amount.toString(),
              currency: guarantee.currency,
            } as Prisma.InputJsonValue,
          },
          {
            agreementId,
            actorId: null,
            actorType: ActorType.SYSTEM,
            type: AgreementEventType.COMPLETED,
          },
        ],
      });

      await tx.agreementStatusHistory.create({
        data: {
          agreementId,
          actorId: userId,
          actorType: ActorType.USER,
          previousOperational: agreement.operationalStatus,
          newOperational: AgreementOperationalStatus.COMPLETED,
          previousFinancial: AgreementFinancialStatus.FUNDS_HELD,
          newFinancial: AgreementFinancialStatus.PAID_OUT,
          reason: 'Dupla confirmação de conclusão',
        },
      });
    });

    await this.auditLogs.log({
      userId,
      action: AuditAction.PAYOUT_COMPLETED,
      resource: 'Agreement',
      resourceId: agreementId,
      newData: { amount: guarantee.amount.toString(), trigger: 'dual_confirmation' },
    });

    for (const p of agreement.participants) {
      if (p.userId) {
        await this.trustScore.recordEvent(
          p.userId,
          TrustScoreEventType.AGREEMENT_COMPLETED,
          agreementId,
          'Agreement',
          'Acordo com garantia concluído por dupla confirmação',
        );
      }
    }

    await this.blockchainRecords.createPending(agreementId, {
      event: 'DUAL_CONFIRMATION_PAYOUT',
      agreementId,
      amount: guarantee.amount.toString(),
      currency: guarantee.currency,
      timestamp: now.toISOString(),
    });

    return this.findOne(userId, agreementId);
  }

  async refund(userId: string, agreementId: string, reason?: string) {
    const agreement = await this.prisma.agreement.findUnique({
      where: { id: agreementId },
      include: {
        participants: true,
        financialGuarantee: {
          include: {
            paymentIntents: {
              where: { status: PaymentIntentStatus.PAID },
              orderBy: { paidAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    if (!agreement) throw new NotFoundException('Acordo não encontrado.');

    const isParticipant = agreement.participants.some((p) => p.userId === userId);
    if (!isParticipant) throw new ForbiddenException('Você não tem acesso a este acordo.');

    if (agreement.type !== AgreementType.WITH_GUARANTEE) {
      throw new BadRequestException('Apenas acordos com garantia podem ser reembolsados.');
    }

    const refundable: AgreementFinancialStatus[] = [
      AgreementFinancialStatus.FUNDS_HELD,
      AgreementFinancialStatus.AWAITING_PAYOUT,
    ];

    if (!refundable.includes(agreement.financialStatus)) {
      throw new BadRequestException(
        'Este acordo não pode ser reembolsado no estado financeiro atual.',
      );
    }

    // If one party already confirmed completion, the other must dispute (not refund)
    if (agreement.operationalStatus === AgreementOperationalStatus.AWAITING_CONFIRMATION) {
      throw new BadRequestException(
        'Uma das partes já confirmou a conclusão deste acordo. Use o endpoint de disputa (/dispute) se houver contestação.',
      );
    }

    const guarantee = agreement.financialGuarantee;
    if (!guarantee) throw new BadRequestException('Garantia financeira não encontrada.');

    const paidIntent = guarantee.paymentIntents[0];
    if (!paidIntent) {
      throw new BadRequestException('Nenhum pagamento confirmado encontrado para reembolso.');
    }

    const idempotencyKey = randomUUID();
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      const refundRecord = await tx.refund.create({
        data: {
          paymentIntentId: paidIntent.id,
          agreementId,
          financialGuaranteeId: guarantee.id,
          requestedById: userId,
          recipientId: agreement.payerId!,
          amount: guarantee.amount,
          currency: guarantee.currency,
          reason,
          status: RefundStatus.COMPLETED,
          idempotencyKey,
          processedAt: now,
          metadata: { simulated: true } as Prisma.InputJsonValue,
        },
      });

      await tx.financialGuarantee.update({
        where: { id: guarantee.id },
        data: {
          status: FinancialGuaranteeStatus.REFUNDED,
          revertedAt: now,
        },
      });

      await tx.agreement.update({
        where: { id: agreementId },
        data: {
          financialStatus: AgreementFinancialStatus.REFUNDED,
          operationalStatus: AgreementOperationalStatus.CANCELLED,
          canceledAt: now,
        },
      });

      await tx.agreementEvent.createMany({
        data: [
          {
            agreementId,
            actorId: userId,
            actorType: ActorType.USER,
            type: AgreementEventType.REFUND_INITIATED,
            payload: { refundId: refundRecord.id } as Prisma.InputJsonValue,
          },
          {
            agreementId,
            actorId: userId,
            actorType: ActorType.USER,
            type: AgreementEventType.REFUND_COMPLETED,
            payload: {
              refundId: refundRecord.id,
              amount: guarantee.amount.toString(),
            } as Prisma.InputJsonValue,
          },
          {
            agreementId,
            actorId: userId,
            actorType: ActorType.USER,
            type: AgreementEventType.CANCELLED,
            payload: reason
              ? ({ reason } as Prisma.InputJsonValue)
              : undefined,
          },
        ],
      });

      await tx.agreementStatusHistory.create({
        data: {
          agreementId,
          actorId: userId,
          actorType: ActorType.USER,
          previousOperational: AgreementOperationalStatus.ACTIVE,
          newOperational: AgreementOperationalStatus.CANCELLED,
          previousFinancial: agreement.financialStatus,
          newFinancial: AgreementFinancialStatus.REFUNDED,
          reason,
        },
      });
    });

    await this.auditLogs.log({
      userId,
      action: AuditAction.REFUND_COMPLETED,
      resource: 'Agreement',
      resourceId: agreementId,
      newData: { amount: guarantee.amount.toString(), reason },
    });

    // Mild negative event for the requester of the refund
    await this.trustScore.recordEvent(
      userId,
      TrustScoreEventType.AGREEMENT_CANCELLED_BY_USER,
      agreementId,
      'Agreement',
      'Reembolso solicitado em acordo com garantia',
    );

    return this.findOne(userId, agreementId);
  }

  async openDispute(userId: string, agreementId: string, dto: OpenDisputeDto) {
    const agreement = await this.prisma.agreement.findUnique({
      where: { id: agreementId },
      include: {
        participants: true,
        financialGuarantee: true,
        dispute: { select: { id: true } },
      },
    });

    if (!agreement) throw new NotFoundException('Acordo não encontrado.');

    const isParticipant = agreement.participants.some((p) => p.userId === userId);
    if (!isParticipant) throw new ForbiddenException('Você não tem acesso a este acordo.');

    if (agreement.type !== AgreementType.WITH_GUARANTEE) {
      throw new BadRequestException(
        'Disputas financeiras só são permitidas em acordos com garantia.',
      );
    }

    if (agreement.financialStatus !== AgreementFinancialStatus.FUNDS_HELD) {
      throw new BadRequestException(
        'Disputas só podem ser abertas enquanto o valor está protegido.',
      );
    }

    if (agreement.disputeRule === DisputeRule.NOT_ALLOWED) {
      throw new BadRequestException('Este acordo não permite disputas.');
    }

    if (agreement.dispute) {
      throw new ConflictException('Já existe uma disputa para este acordo.');
    }

    const guarantee = agreement.financialGuarantee!;
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.dispute.create({
        data: {
          agreementId,
          openedById: userId,
          reason: dto.reason,
          description: dto.description,
          status: 'OPEN',
        },
      });

      await tx.financialGuarantee.update({
        where: { id: guarantee.id },
        data: { status: FinancialGuaranteeStatus.FROZEN_DISPUTE },
      });

      await tx.agreement.update({
        where: { id: agreementId },
        data: {
          financialStatus: AgreementFinancialStatus.DISPUTED,
          disputedAt: now,
        },
      });

      await tx.agreementEvent.create({
        data: {
          agreementId,
          actorId: userId,
          actorType: ActorType.USER,
          type: AgreementEventType.DISPUTE_OPENED,
          payload: { reason: dto.reason } as Prisma.InputJsonValue,
        },
      });

      await tx.agreementStatusHistory.create({
        data: {
          agreementId,
          actorId: userId,
          actorType: ActorType.USER,
          previousFinancial: AgreementFinancialStatus.FUNDS_HELD,
          newFinancial: AgreementFinancialStatus.DISPUTED,
          reason: dto.reason,
        },
      });
    });

    await this.auditLogs.log({
      userId,
      action: AuditAction.AGREEMENT_DISPUTED,
      resource: 'Agreement',
      resourceId: agreementId,
      newData: { reason: dto.reason },
    });

    // Neutral score event (openings are informational, not punitive)
    await this.trustScore.recordEvent(
      userId,
      TrustScoreEventType.DISPUTE_OPENED,
      agreementId,
      'Agreement',
      'Disputa aberta',
    );

    return this.findOne(userId, agreementId);
  }

  async getDispute(userId: string, agreementId: string) {
    const agreement = await this.loadAndVerifyAccess(userId, agreementId);

    const dispute = await this.prisma.dispute.findUnique({
      where: { agreementId: agreement.id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            senderId: true,
            senderType: true,
            type: true,
            content: true,
            createdAt: true,
          },
        },
      },
    });

    if (!dispute) {
      throw new NotFoundException('Nenhuma disputa encontrada para este acordo.');
    }

    return dispute;
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
            select: { id: true, userId: true, role: true, status: true },
          },
          financialGuarantee: {
            select: { id: true, status: true, amount: true, currency: true },
          },
          dispute: {
            select: { id: true, status: true },
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
        financialGuarantee: { select: GUARANTEE_SUMMARY_SELECT },
        dispute: { select: DISPUTE_SUMMARY_SELECT },
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

    if (
      agreement.operationalStatus !== AgreementOperationalStatus.AWAITING_ACCEPTANCE
    ) {
      throw new BadRequestException('Este acordo não está aguardando aceite.');
    }

    const participant = agreement.participants.find(
      (p) =>
        p.userId === userId &&
        p.role === AgreementParticipantRole.COUNTERPART,
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

    if (
      agreement.operationalStatus !== AgreementOperationalStatus.AWAITING_ACCEPTANCE
    ) {
      throw new BadRequestException(
        'Este acordo não pode ser recusado no estado atual.',
      );
    }

    const participant = agreement.participants.find(
      (p) =>
        p.userId === userId &&
        p.role === AgreementParticipantRole.COUNTERPART,
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

    // Guaranteed agreement with locked funds: must use /refund
    if (
      agreement.type === AgreementType.WITH_GUARANTEE &&
      agreement.financialStatus === AgreementFinancialStatus.FUNDS_HELD
    ) {
      throw new BadRequestException(
        'Valor protegido. Use o endpoint de reembolso para cancelar este acordo com garantia.',
      );
    }

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

    // Guaranteed agreements must use /release (payout required)
    if (agreement.type === AgreementType.WITH_GUARANTEE) {
      throw new BadRequestException(
        'Acordos com garantia devem ser concluídos via endpoint de liberação (/release).',
      );
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
