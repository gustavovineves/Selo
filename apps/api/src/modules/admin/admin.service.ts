import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  AgreementType,
  AgreementOperationalStatus,
  AgreementFinancialStatus,
  AgreementEventType,
  ActorType,
  DisputeStatus,
  DisputeMessageType,
  FinancialGuaranteeStatus,
  PayoutStatus,
  RefundStatus,
  TrustScoreEventType,
  AuditAction,
  Prisma,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { TrustScoreService } from '../trust-score/trust-score.service';
import { BlockchainRecordsService } from '../blockchain-records/blockchain-records.service';
import { AdminResolveReleaseDto } from './dto/admin-resolve-release.dto';
import { AdminResolveRefundDto } from './dto/admin-resolve-refund.dto';
import { AdminListDisputesDto } from './dto/admin-list-disputes.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
    private readonly trustScore: TrustScoreService,
    private readonly blockchainRecords: BlockchainRecordsService,
  ) {}

  async getStats() {
    const [totalUsers, totalAgreements, totalDisputes, openDisputes] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.agreement.count(),
        this.prisma.dispute.count(),
        this.prisma.dispute.count({ where: { status: DisputeStatus.OPEN } }),
      ]);

    return {
      totalUsers,
      totalAgreements,
      totalDisputes,
      openDisputes,
      generatedAt: new Date().toISOString(),
    };
  }

  // ── Disputas ─────────────────────────────────────────────────

  async listDisputes(query: AdminListDisputesDto) {
    const { status, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.DisputeWhereInput = status ? { status } : {};

    const [data, total] = await Promise.all([
      this.prisma.dispute.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          agreement: {
            select: {
              id: true,
              title: true,
              amount: true,
              currency: true,
              operationalStatus: true,
              financialStatus: true,
              payerId: true,
              receiverId: true,
              createdAt: true,
              financialGuarantee: {
                select: { id: true, status: true, amount: true, currency: true },
              },
              payer: {
                select: {
                  id: true,
                  profile: { select: { fullName: true, displayName: true } },
                },
              },
              receiver: {
                select: {
                  id: true,
                  profile: { select: { fullName: true, displayName: true } },
                },
              },
            },
          },
          openedBy: {
            select: {
              id: true,
              profile: { select: { fullName: true, displayName: true } },
            },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              id: true,
              type: true,
              content: true,
              createdAt: true,
              senderType: true,
            },
          },
          _count: { select: { messages: true } },
        },
      }),
      this.prisma.dispute.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async getDispute(disputeId: string) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        agreement: {
          include: {
            participants: {
              include: {
                user: {
                  select: {
                    id: true,
                    profile: {
                      select: { fullName: true, displayName: true, avatarUrl: true },
                    },
                  },
                },
              },
            },
            financialGuarantee: {
              include: {
                paymentIntents: {
                  select: {
                    id: true,
                    status: true,
                    amount: true,
                    currency: true,
                    paidAt: true,
                    pixCharge: {
                      select: {
                        id: true,
                        txid: true,
                        pixKey: true,
                        qrCode: true,
                        amount: true,
                        status: true,
                      },
                    },
                  },
                },
                payouts: {
                  select: {
                    id: true,
                    status: true,
                    amount: true,
                    currency: true,
                    completedAt: true,
                    metadata: true,
                  },
                },
                refunds: {
                  select: {
                    id: true,
                    status: true,
                    amount: true,
                    currency: true,
                    processedAt: true,
                    reason: true,
                    metadata: true,
                  },
                },
              },
            },
            events: { orderBy: { createdAt: 'asc' } },
            payer: {
              select: {
                id: true,
                profile: { select: { fullName: true, displayName: true } },
              },
            },
            receiver: {
              select: {
                id: true,
                profile: { select: { fullName: true, displayName: true } },
              },
            },
          },
        },
        openedBy: {
          select: {
            id: true,
            profile: { select: { fullName: true, displayName: true } },
          },
        },
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!dispute) throw new NotFoundException('Disputa não encontrada.');
    return dispute;
  }

  // ── Resolver liberando ao recebedor ──────────────────────────

  async resolveRelease(
    adminId: string,
    disputeId: string,
    dto: AdminResolveReleaseDto,
  ) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        agreement: {
          include: {
            participants: true,
            financialGuarantee: true,
          },
        },
      },
    });

    if (!dispute) throw new NotFoundException('Disputa não encontrada.');

    this.assertDisputeOpen(dispute.status);

    const agreement = dispute.agreement;

    if (agreement.type !== AgreementType.WITH_GUARANTEE) {
      throw new BadRequestException(
        'Este acordo não possui garantia financeira.',
      );
    }

    const guarantee = agreement.financialGuarantee;
    if (!guarantee || guarantee.status !== FinancialGuaranteeStatus.FROZEN_DISPUTE) {
      throw new BadRequestException(
        'A garantia financeira não está travada por disputa.',
      );
    }

    if (agreement.financialStatus !== AgreementFinancialStatus.DISPUTED) {
      throw new BadRequestException(
        'O acordo não está no estado de disputa.',
      );
    }

    if (!agreement.receiverId) {
      throw new BadRequestException(
        'Este acordo não possui recebedor definido.',
      );
    }

    const receiverKey = await this.prisma.receivingKey.findFirst({
      where: { userId: agreement.receiverId, status: 'ACTIVE' },
    });

    const destinationSnapshot = receiverKey
      ? { key: receiverKey.key, normalizedKey: receiverKey.normalizedKey }
      : (agreement.receiverKeySnapshot as object | null) ?? {};

    const idempotencyKey = randomUUID();
    const now = new Date();
    const resolutionText = dto.adminNote
      ? `${dto.reason}\n\nNota interna: ${dto.adminNote}`
      : dto.reason;

    await this.prisma.$transaction(async (tx) => {
      const payout = await tx.payout.create({
        data: {
          agreementId: agreement.id,
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
          metadata: {
            simulated: true,
            triggeredBy: 'admin_dispute_resolution',
            adminId,
          } as Prisma.InputJsonValue,
        },
      });

      await tx.financialGuarantee.update({
        where: { id: guarantee.id },
        data: { status: FinancialGuaranteeStatus.PAID_OUT, releasedAt: now },
      });

      await tx.agreement.update({
        where: { id: agreement.id },
        data: {
          financialStatus: AgreementFinancialStatus.PAID_OUT,
          operationalStatus: AgreementOperationalStatus.COMPLETED,
          completedAt: now,
        },
      });

      await tx.dispute.update({
        where: { id: disputeId },
        data: {
          status: DisputeStatus.RESOLVED_FAVOR_COUNTERPART,
          resolvedById: adminId,
          resolvedByType: ActorType.ADMIN,
          resolvedAt: now,
          closedAt: now,
          resolution: resolutionText,
        },
      });

      await tx.disputeMessage.create({
        data: {
          disputeId,
          senderType: 'SYSTEM',
          type: DisputeMessageType.RESOLUTION,
          content: `Disputa resolvida pelo administrador. Decisão: valor liberado ao recebedor. Justificativa: ${dto.reason}`,
        },
      });

      await tx.agreementEvent.createMany({
        data: [
          {
            agreementId: agreement.id,
            actorId: adminId,
            actorType: ActorType.ADMIN,
            type: AgreementEventType.DISPUTE_RESOLVED,
            payload: {
              disputeId,
              decision: 'RELEASE_TO_RECEIVER',
              resolvedBy: adminId,
              reason: dto.reason,
            } as Prisma.InputJsonValue,
          },
          {
            agreementId: agreement.id,
            actorId: adminId,
            actorType: ActorType.ADMIN,
            type: AgreementEventType.PAYOUT_INITIATED,
            payload: {
              payoutId: payout.id,
              triggeredBy: 'admin_dispute_resolution',
            } as Prisma.InputJsonValue,
          },
          {
            agreementId: agreement.id,
            actorId: adminId,
            actorType: ActorType.ADMIN,
            type: AgreementEventType.PAYOUT_COMPLETED,
            payload: {
              payoutId: payout.id,
              amount: guarantee.amount.toString(),
              currency: guarantee.currency,
            } as Prisma.InputJsonValue,
          },
          {
            agreementId: agreement.id,
            actorId: adminId,
            actorType: ActorType.ADMIN,
            type: AgreementEventType.COMPLETED,
          },
        ],
      });

      await tx.agreementStatusHistory.create({
        data: {
          agreementId: agreement.id,
          actorId: adminId,
          actorType: ActorType.ADMIN,
          previousOperational: agreement.operationalStatus,
          newOperational: AgreementOperationalStatus.COMPLETED,
          previousFinancial: AgreementFinancialStatus.DISPUTED,
          newFinancial: AgreementFinancialStatus.PAID_OUT,
          reason: `Resolução administrativa — disputa encerrada: ${dto.reason}`,
        },
      });
    });

    await this.auditLogs.log({
      adminUserId: adminId,
      action: AuditAction.ADMIN_DISPUTE_RESOLVED,
      resource: 'Dispute',
      resourceId: disputeId,
      newData: {
        decision: 'RELEASE_TO_RECEIVER',
        agreementId: agreement.id,
        amount: guarantee.amount.toString(),
        currency: guarantee.currency,
        reason: dto.reason,
      },
    });

    if (agreement.receiverId) {
      await this.trustScore.recordEvent(
        agreement.receiverId,
        TrustScoreEventType.DISPUTE_WON,
        agreement.id,
        'Agreement',
        'Disputa resolvida a favor do recebedor pelo administrador',
      );
    }

    if (agreement.payerId) {
      await this.trustScore.recordEvent(
        agreement.payerId,
        TrustScoreEventType.DISPUTE_LOST,
        agreement.id,
        'Agreement',
        'Disputa resolvida pelo administrador',
        -20,
      );
    }

    await this.blockchainRecords.createPending(agreement.id, {
      event: 'DISPUTE_RESOLVED',
      decision: 'RELEASE_TO_RECEIVER',
      disputeId,
      agreementId: agreement.id,
      amount: guarantee.amount.toString(),
      currency: guarantee.currency,
      resolvedAt: now.toISOString(),
    });

    return this.getDispute(disputeId);
  }

  // ── Resolver reembolsando ao pagador ─────────────────────────

  async resolveRefund(
    adminId: string,
    disputeId: string,
    dto: AdminResolveRefundDto,
  ) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        agreement: {
          include: {
            participants: true,
            financialGuarantee: {
              include: {
                paymentIntents: {
                  where: { status: 'PAID' },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    if (!dispute) throw new NotFoundException('Disputa não encontrada.');

    this.assertDisputeOpen(dispute.status);

    const agreement = dispute.agreement;

    if (agreement.type !== AgreementType.WITH_GUARANTEE) {
      throw new BadRequestException(
        'Este acordo não possui garantia financeira.',
      );
    }

    const guarantee = agreement.financialGuarantee;
    if (!guarantee || guarantee.status !== FinancialGuaranteeStatus.FROZEN_DISPUTE) {
      throw new BadRequestException(
        'A garantia financeira não está travada por disputa.',
      );
    }

    if (agreement.financialStatus !== AgreementFinancialStatus.DISPUTED) {
      throw new BadRequestException(
        'O acordo não está no estado de disputa.',
      );
    }

    if (!agreement.payerId) {
      throw new BadRequestException(
        'Este acordo não possui pagador definido.',
      );
    }

    const paidPaymentIntent = guarantee.paymentIntents[0];
    if (!paidPaymentIntent) {
      throw new BadRequestException(
        'Nenhum pagamento confirmado encontrado para reembolso.',
      );
    }

    const idempotencyKey = randomUUID();
    const now = new Date();
    const resolutionText = dto.adminNote
      ? `${dto.reason}\n\nNota interna: ${dto.adminNote}`
      : dto.reason;

    await this.prisma.$transaction(async (tx) => {
      const refund = await tx.refund.create({
        data: {
          paymentIntentId: paidPaymentIntent.id,
          agreementId: agreement.id,
          financialGuaranteeId: guarantee.id,
          requestedById: agreement.payerId!,
          recipientId: agreement.payerId!,
          amount: guarantee.amount,
          currency: guarantee.currency,
          reason: dto.reason,
          status: RefundStatus.COMPLETED,
          idempotencyKey,
          processedAt: now,
          metadata: {
            simulated: true,
            triggeredBy: 'admin_dispute_resolution',
            adminId,
          } as Prisma.InputJsonValue,
        },
      });

      await tx.financialGuarantee.update({
        where: { id: guarantee.id },
        data: { status: FinancialGuaranteeStatus.REFUNDED, revertedAt: now },
      });

      await tx.agreement.update({
        where: { id: agreement.id },
        data: {
          financialStatus: AgreementFinancialStatus.REFUNDED,
          operationalStatus: AgreementOperationalStatus.CANCELLED,
          canceledAt: now,
        },
      });

      await tx.dispute.update({
        where: { id: disputeId },
        data: {
          status: DisputeStatus.RESOLVED_FAVOR_CREATOR,
          resolvedById: adminId,
          resolvedByType: ActorType.ADMIN,
          resolvedAt: now,
          closedAt: now,
          resolution: resolutionText,
        },
      });

      await tx.disputeMessage.create({
        data: {
          disputeId,
          senderType: 'SYSTEM',
          type: DisputeMessageType.RESOLUTION,
          content: `Disputa resolvida pelo administrador. Decisão: valor reembolsado ao pagador. Justificativa: ${dto.reason}`,
        },
      });

      await tx.agreementEvent.createMany({
        data: [
          {
            agreementId: agreement.id,
            actorId: adminId,
            actorType: ActorType.ADMIN,
            type: AgreementEventType.DISPUTE_RESOLVED,
            payload: {
              disputeId,
              decision: 'REFUND_TO_PAYER',
              resolvedBy: adminId,
              reason: dto.reason,
            } as Prisma.InputJsonValue,
          },
          {
            agreementId: agreement.id,
            actorId: adminId,
            actorType: ActorType.ADMIN,
            type: AgreementEventType.REFUND_INITIATED,
            payload: {
              refundId: refund.id,
              triggeredBy: 'admin_dispute_resolution',
            } as Prisma.InputJsonValue,
          },
          {
            agreementId: agreement.id,
            actorId: adminId,
            actorType: ActorType.ADMIN,
            type: AgreementEventType.REFUND_COMPLETED,
            payload: {
              refundId: refund.id,
              amount: guarantee.amount.toString(),
              currency: guarantee.currency,
            } as Prisma.InputJsonValue,
          },
          {
            agreementId: agreement.id,
            actorId: adminId,
            actorType: ActorType.ADMIN,
            type: AgreementEventType.CANCELLED,
            payload: {
              reason: 'Reembolso determinado por resolução administrativa de disputa.',
            } as Prisma.InputJsonValue,
          },
        ],
      });

      await tx.agreementStatusHistory.create({
        data: {
          agreementId: agreement.id,
          actorId: adminId,
          actorType: ActorType.ADMIN,
          previousOperational: agreement.operationalStatus,
          newOperational: AgreementOperationalStatus.CANCELLED,
          previousFinancial: AgreementFinancialStatus.DISPUTED,
          newFinancial: AgreementFinancialStatus.REFUNDED,
          reason: `Resolução administrativa — disputa encerrada com reembolso: ${dto.reason}`,
        },
      });
    });

    await this.auditLogs.log({
      adminUserId: adminId,
      action: AuditAction.ADMIN_DISPUTE_RESOLVED,
      resource: 'Dispute',
      resourceId: disputeId,
      newData: {
        decision: 'REFUND_TO_PAYER',
        agreementId: agreement.id,
        amount: guarantee.amount.toString(),
        currency: guarantee.currency,
        reason: dto.reason,
      },
    });

    if (agreement.payerId) {
      await this.trustScore.recordEvent(
        agreement.payerId,
        TrustScoreEventType.DISPUTE_WON,
        agreement.id,
        'Agreement',
        'Disputa resolvida a favor do pagador pelo administrador',
      );
    }

    if (agreement.receiverId) {
      await this.trustScore.recordEvent(
        agreement.receiverId,
        TrustScoreEventType.DISPUTE_LOST,
        agreement.id,
        'Agreement',
        'Disputa resolvida pelo administrador',
        -20,
      );
    }

    await this.blockchainRecords.createPending(agreement.id, {
      event: 'DISPUTE_RESOLVED',
      decision: 'REFUND_TO_PAYER',
      disputeId,
      agreementId: agreement.id,
      amount: guarantee.amount.toString(),
      currency: guarantee.currency,
      resolvedAt: now.toISOString(),
    });

    return this.getDispute(disputeId);
  }

  // ── Helpers ──────────────────────────────────────────────────

  private assertDisputeOpen(status: DisputeStatus): void {
    if (status !== DisputeStatus.OPEN) {
      throw new BadRequestException(
        `Apenas disputas abertas podem ser resolvidas. Status atual: ${status}`,
      );
    }
  }
}
