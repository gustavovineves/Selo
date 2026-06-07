import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
import { NotificationsService } from '../notifications/notifications.service';
import {
  PAYMENT_PROVIDER_TOKEN,
  IPaymentProvider,
} from './providers/payment-provider.interface';
import { FitbankWebhookDto } from './dto/fitbank-webhook.dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
    private readonly trustScore: TrustScoreService,
    private readonly blockchainRecords: BlockchainRecordsService,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
    @Inject(PAYMENT_PROVIDER_TOKEN) private readonly paymentProvider: IPaymentProvider,
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

    // Notifica todos os participantes: valor protegido
    for (const p of agreement.participants) {
      if (!p.userId) continue;
      const isPayer = p.userId === userId;
      this.notifications
        .send(
          p.userId,
          'FUNDS_LOCKED',
          'Valor protegido',
          isPayer
            ? 'O pagamento foi confirmado e o valor está guardado até a conclusão do acordo.'
            : 'O pagador confirmou o depósito. O valor está guardado até a conclusão do acordo.',
          { agreementId: agreement.id },
        )
        .catch(() => {});
    }

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

  // ── Webhook Fitbank / Pix Sandbox ────────────────────────────────

  async handleFitbankWebhook(
    headers: Record<string, string>,
    rawBody: string,
    body: FitbankWebhookDto,
  ): Promise<{ received: boolean; message: string }> {
    const webhookSecret = this.config.get<string>('FITBANK_WEBHOOK_SECRET');

    const signatureValid = this.paymentProvider.validateWebhookSignature(
      webhookSecret,
      headers,
      rawBody,
    );

    if (!signatureValid) {
      this.logger.warn('Webhook recebido com assinatura inválida.');
      throw new UnauthorizedException('Assinatura do webhook inválida.');
    }

    const webhookEvent = this.paymentProvider.parseWebhookPayload(
      body as unknown as Record<string, unknown>,
    );

    if (webhookEvent.eventType !== 'PIX_CONFIRMED') {
      this.logger.log(
        `Webhook recebido: evento ${webhookEvent.eventType} não requer ação (txid: ${webhookEvent.txid}).`,
      );
      return { received: true, message: `Evento ${webhookEvent.eventType} registrado sem ação.` };
    }

    if (!webhookEvent.txid) {
      throw new BadRequestException('Webhook PIX_CONFIRMED sem txid.');
    }

    const pixCharge = await this.prisma.pixCharge.findUnique({
      where: { txid: webhookEvent.txid },
      include: {
        paymentIntent: {
          include: {
            agreement: {
              include: {
                participants: { select: { userId: true } },
                financialGuarantee: true,
              },
            },
          },
        },
      },
    });

    if (!pixCharge) {
      this.logger.warn(`Webhook PIX_CONFIRMED: PixCharge não encontrado para txid ${webhookEvent.txid}.`);
      return { received: true, message: 'txid não encontrado — webhook ignorado.' };
    }

    const paymentIntent = pixCharge.paymentIntent;

    // Idempotência: já processado
    if (paymentIntent.status === PaymentIntentStatus.PAID) {
      this.logger.log(`Webhook duplicado para txid ${webhookEvent.txid} — ignorado (idempotente).`);
      return { received: true, message: 'Pagamento já processado (idempotente).' };
    }

    if (paymentIntent.status !== PaymentIntentStatus.AWAITING_PAYMENT) {
      throw new BadRequestException(
        `PaymentIntent em estado inesperado: ${paymentIntent.status}.`,
      );
    }

    const agreement = paymentIntent.agreement;
    if (!agreement) {
      throw new BadRequestException('PaymentIntent não está associado a um acordo.');
    }

    const guarantee = agreement.financialGuarantee;
    if (!guarantee) {
      throw new BadRequestException('Garantia financeira não encontrada.');
    }

    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.paymentIntent.update({
        where: { id: paymentIntent.id },
        data: { status: PaymentIntentStatus.PAID, paidAt: now },
      });

      await tx.pixCharge.update({
        where: { id: pixCharge.id },
        data: {
          status: PixChargeStatus.COMPLETED,
          paidAt: now,
          endToEndId: webhookEvent.endToEndId ?? undefined,
        },
      });

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
            paymentIntentId: paymentIntent.id,
            txid: webhookEvent.txid,
            endToEndId: webhookEvent.endToEndId,
            amount: guarantee.amount.toString(),
            currency: guarantee.currency,
            webhookProvider: this.paymentProvider.providerName,
            processedAt: now.toISOString(),
          } as Prisma.InputJsonValue,
        },
      });

      await tx.agreementStatusHistory.create({
        data: {
          agreementId: agreement.id,
          actorType: ActorType.SYSTEM,
          previousFinancial: AgreementFinancialStatus.AWAITING_PAYMENT,
          newFinancial: AgreementFinancialStatus.FUNDS_HELD,
        },
      });
    });

    await this.auditLogs.log({
      action: AuditAction.PAYMENT_COMPLETED,
      resource: 'PaymentIntent',
      resourceId: paymentIntent.id,
      newData: {
        agreementId: agreement.id,
        txid: webhookEvent.txid,
        webhookProvider: this.paymentProvider.providerName,
      },
    });

    await this.blockchainRecords.createPending(agreement.id, {
      event: 'FUNDS_LOCKED',
      agreementId: agreement.id,
      paymentIntentId: paymentIntent.id,
      txid: webhookEvent.txid,
      amount: guarantee.amount.toString(),
      currency: guarantee.currency,
      webhookProvider: this.paymentProvider.providerName,
      timestamp: now.toISOString(),
    });

    for (const p of agreement.participants) {
      if (!p.userId) continue;
      this.notifications
        .send(
          p.userId,
          'FUNDS_LOCKED',
          'Valor protegido',
          'O pagamento foi confirmado e o valor está guardado até a conclusão do acordo.',
          { agreementId: agreement.id },
        )
        .catch(() => {});
    }

    this.logger.log(
      `Webhook processado: txid=${webhookEvent.txid}, agreementId=${agreement.id}, provider=${this.paymentProvider.providerName}`,
    );

    return { received: true, message: 'Pagamento confirmado e valor protegido.' };
  }
}
