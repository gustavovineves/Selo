import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import {
  AgreementFinancialStatus,
  AgreementEventType,
  ActorType,
  FinancialGuaranteeStatus,
  PaymentIntentStatus,
  PixChargeStatus,
  AuditAction,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { TrustScoreService } from '../trust-score/trust-score.service';
import { BlockchainRecordsService } from '../blockchain-records/blockchain-records.service';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
    private readonly trustScore: TrustScoreService,
    private readonly blockchainRecords: BlockchainRecordsService,
  ) {}

  async simulateConfirmation(userId: string, paymentIntentId: string) {
    const paymentIntent = await this.prisma.paymentIntent.findUnique({
      where: { id: paymentIntentId },
      include: {
        agreement: {
          include: {
            participants: { select: { userId: true } },
            financialGuarantee: true,
          },
        },
        pixCharge: true,
      },
    });

    if (!paymentIntent) throw new NotFoundException('Pagamento não encontrado.');
    if (!paymentIntent.agreement)
      throw new BadRequestException('Pagamento não está associado a um acordo.');

    const agreement = paymentIntent.agreement;

    const isParticipant = agreement.participants.some((p) => p.userId === userId);
    if (!isParticipant)
      throw new ForbiddenException('Você não tem acesso a este pagamento.');

    if (paymentIntent.status === PaymentIntentStatus.PAID) {
      throw new ConflictException('Este pagamento já foi confirmado.');
    }

    if (paymentIntent.status !== PaymentIntentStatus.AWAITING_PAYMENT) {
      throw new BadRequestException(
        'Este pagamento não pode ser confirmado no estado atual.',
      );
    }

    const guarantee = agreement.financialGuarantee;
    if (!guarantee)
      throw new BadRequestException('Garantia financeira não encontrada.');

    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.paymentIntent.update({
        where: { id: paymentIntentId },
        data: { status: PaymentIntentStatus.PAID, paidAt: now },
      });

      if (paymentIntent.pixCharge) {
        await tx.pixCharge.update({
          where: { id: paymentIntent.pixCharge.id },
          data: { status: PixChargeStatus.COMPLETED, paidAt: now },
        });
      }

      await tx.financialGuarantee.update({
        where: { id: guarantee.id },
        data: { status: FinancialGuaranteeStatus.LOCKED, lockedAt: now },
      });

      await tx.agreement.update({
        where: { id: agreement.id },
        data: { financialStatus: AgreementFinancialStatus.FUNDS_HELD },
      });

      await tx.agreementEvent.create({
        data: {
          agreementId: agreement.id,
          actorType: ActorType.SYSTEM,
          type: AgreementEventType.FUNDS_LOCKED,
          payload: {
            paymentIntentId,
            amount: guarantee.amount.toString(),
            currency: guarantee.currency,
            simulatedAt: now.toISOString(),
          } as Prisma.InputJsonValue,
        },
      });

      await tx.agreementStatusHistory.create({
        data: {
          agreementId: agreement.id,
          actorId: userId,
          actorType: ActorType.USER,
          previousFinancial: AgreementFinancialStatus.AWAITING_PAYMENT,
          newFinancial: AgreementFinancialStatus.FUNDS_HELD,
        },
      });
    });

    await this.auditLogs.log({
      userId,
      action: AuditAction.PAYMENT_COMPLETED,
      resource: 'PaymentIntent',
      resourceId: paymentIntentId,
      newData: { paymentIntentId, agreementId: agreement.id },
    });

    await this.blockchainRecords.createPending(agreement.id, {
      event: 'FUNDS_LOCKED',
      agreementId: agreement.id,
      paymentIntentId,
      amount: guarantee.amount.toString(),
      currency: guarantee.currency,
      timestamp: now.toISOString(),
    });

    return this.prisma.paymentIntent.findUnique({
      where: { id: paymentIntentId },
      include: {
        pixCharge: { select: { id: true, status: true, paidAt: true } },
        agreement: {
          select: {
            id: true,
            operationalStatus: true,
            financialStatus: true,
            financialGuarantee: {
              select: { id: true, status: true, amount: true, currency: true, lockedAt: true },
            },
          },
        },
      },
    });
  }
}
