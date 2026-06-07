import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KycStatus, FinancialVerificationLevel } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { TrustScoreService } from '../trust-score/trust-score.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UpdateFinancialProfileDto } from './dto/update-financial-profile.dto';
import { validateCpf, normalizeCpf, maskCpf } from '../../common/utils/cpf.util';

@Injectable()
export class FinancialProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly auditLogs: AuditLogsService,
    private readonly trustScore: TrustScoreService,
    private readonly notifications: NotificationsService,
  ) {}

  async getFinancialProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        document: true,
        documentType: true,
        phone: true,
        kycStatus: true,
        profile: { select: { fullName: true, birthDate: true } },
        financialProfile: true,
      },
    });

    if (!user) throw new NotFoundException('Usuário não encontrado.');

    const fp = user.financialProfile;
    const cpfMasked = user.document ? maskCpf(user.document) : null;

    const pendingRequirements = this.buildPendingRequirements(user);

    return {
      kycStatus: user.kycStatus,
      kycStatusLabel: this.humanLabel(user.kycStatus),
      financialVerificationLevel: fp?.verificationLevel ?? FinancialVerificationLevel.NONE,
      cpfMasked,
      fullName: user.profile?.fullName ?? null,
      birthDate: user.profile?.birthDate ?? null,
      phone: user.phone ?? null,
      acceptedFinancialTerms: fp?.acceptedFinancialTermsAt != null,
      acceptedFinancialTermsAt: fp?.acceptedFinancialTermsAt ?? null,
      kycSubmittedAt: fp?.kycSubmittedAt ?? null,
      kycApprovedAt: fp?.kycApprovedAt ?? null,
      kycRejectedAt: fp?.kycRejectedAt ?? null,
      kycRejectionReason: fp?.kycRejectionReason ?? null,
      pendingRequirements,
      humanMessage: this.humanMessage(user.kycStatus, pendingRequirements),
    };
  }

  async updateFinancialProfile(userId: string, dto: UpdateFinancialProfileDto) {
    if (dto.cpf) {
      if (!validateCpf(dto.cpf)) {
        throw new BadRequestException('CPF inválido. Verifique os dígitos informados.');
      }
    }

    await this.prisma.$transaction(async (tx) => {
      // Update User fields
      const userUpdate: Record<string, unknown> = {};
      if (dto.cpf) {
        const normalized = normalizeCpf(dto.cpf);
        // Check uniqueness (another user with same CPF)
        const existing = await tx.user.findFirst({
          where: { document: normalized, id: { not: userId } },
          select: { id: true },
        });
        if (existing) {
          throw new BadRequestException('CPF já cadastrado para outro usuário.');
        }
        userUpdate.document = normalized;
        userUpdate.documentType = 'CPF';
      }
      if (dto.phone) {
        userUpdate.phone = dto.phone;
      }

      if (Object.keys(userUpdate).length > 0) {
        await tx.user.update({ where: { id: userId }, data: userUpdate });
      }

      // Update UserProfile
      const profileUpdate: Record<string, unknown> = {};
      if (dto.fullName) profileUpdate.fullName = dto.fullName;
      if (dto.birthDate) profileUpdate.birthDate = new Date(dto.birthDate);

      if (Object.keys(profileUpdate).length > 0) {
        await tx.userProfile.upsert({
          where: { userId },
          update: profileUpdate,
          create: { userId, fullName: (dto.fullName as string) ?? 'Usuário', ...profileUpdate },
        });
      }

      // Update FinancialProfile metadata
      const fpUpdate: Record<string, unknown> = {};
      if (dto.acceptedFinancialTerms === true) {
        fpUpdate.acceptedFinancialTermsAt = new Date();
      }
      // Compute verification level from what's filled
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: {
          document: true,
          phone: true,
          profile: { select: { fullName: true, birthDate: true } },
          financialProfile: { select: { acceptedFinancialTermsAt: true } },
        },
      });
      const cpfOk = !!(dto.cpf ?? user?.document);
      const nameOk = !!(dto.fullName ?? user?.profile?.fullName);
      const termsOk = !!(dto.acceptedFinancialTerms || user?.financialProfile?.acceptedFinancialTermsAt);
      const birthOk = !!(dto.birthDate ?? user?.profile?.birthDate);
      const phoneOk = !!(dto.phone ?? user?.phone);

      if (cpfOk && nameOk && termsOk && birthOk && phoneOk) {
        fpUpdate.verificationLevel = FinancialVerificationLevel.STANDARD;
      } else if (cpfOk && nameOk && termsOk) {
        fpUpdate.verificationLevel = FinancialVerificationLevel.BASIC;
      }

      await tx.financialProfile.upsert({
        where: { userId },
        update: fpUpdate,
        create: { userId, ...fpUpdate },
      });
    });

    return this.getFinancialProfile(userId);
  }

  async submitForReview(userId: string) {
    const profile = await this.getFinancialProfile(userId);

    if (
      profile.kycStatus === KycStatus.SUBMITTED ||
      profile.kycStatus === KycStatus.UNDER_REVIEW ||
      profile.kycStatus === KycStatus.APPROVED
    ) {
      throw new BadRequestException(
        'Verificação já enviada ou aprovada. Status atual: ' + profile.kycStatusLabel,
      );
    }

    if (!profile.acceptedFinancialTerms) {
      throw new BadRequestException(
        'Você precisa aceitar os termos de valor protegido antes de enviar.',
      );
    }

    if (!profile.cpfMasked) {
      throw new BadRequestException('CPF é obrigatório para enviar a verificação.');
    }

    const now = new Date();

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { kycStatus: KycStatus.SUBMITTED },
      }),
      this.prisma.financialProfile.upsert({
        where: { userId },
        update: { kycSubmittedAt: now },
        create: { userId, kycSubmittedAt: now },
      }),
    ]);

    this.auditLogs
      .log({
        userId,
        action: 'KYC_SUBMITTED',
        resource: 'FinancialProfile',
        resourceId: userId,
        newData: { kycStatus: KycStatus.SUBMITTED, submittedAt: now.toISOString() },
      })
      .catch(() => {});

    this.notifications
      .send(
        userId,
        'KYC_SUBMITTED',
        'Verificação financeira enviada',
        'Recebemos seus dados. Analisaremos em breve e você será notificado.',
        { type: 'kyc_submitted' },
      )
      .catch(() => {});

    return this.getFinancialProfile(userId);
  }

  async simulateApproval(userId: string) {
    this.assertSimulationAllowed();

    const now = new Date();

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { kycStatus: KycStatus.APPROVED },
      }),
      this.prisma.financialProfile.upsert({
        where: { userId },
        update: {
          kycApprovedAt: now,
          kycRejectedAt: null,
          kycRejectionReason: null,
          verificationLevel: FinancialVerificationLevel.FULL,
        },
        create: {
          userId,
          kycApprovedAt: now,
          verificationLevel: FinancialVerificationLevel.FULL,
        },
      }),
    ]);

    // KYC verification boosts trust score (+50)
    this.trustScore
      .recordEvent(userId, 'KYC_VERIFIED', userId, 'FinancialProfile', 'Verificação financeira aprovada')
      .catch(() => {});

    this.notifications
      .send(
        userId,
        'KYC_APPROVED',
        'Verificação financeira aprovada',
        'Sua verificação foi aprovada. Você já pode usar o valor protegido.',
        { type: 'kyc_approved' },
      )
      .catch(() => {});

    return this.getFinancialProfile(userId);
  }

  async simulateRejection(userId: string, reason?: string) {
    this.assertSimulationAllowed();

    const now = new Date();
    const rejectionReason =
      reason ?? 'Dados não conferem com os registros. Corrija e tente novamente.';

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { kycStatus: KycStatus.REJECTED },
      }),
      this.prisma.financialProfile.upsert({
        where: { userId },
        update: { kycRejectedAt: now, kycRejectionReason: rejectionReason },
        create: { userId, kycRejectedAt: now, kycRejectionReason: rejectionReason },
      }),
    ]);

    this.notifications
      .send(
        userId,
        'KYC_REJECTED',
        'Verificação financeira não aprovada',
        'Sua verificação não foi aprovada. Corrija os dados e tente novamente.',
        { type: 'kyc_rejected', reason: rejectionReason },
      )
      .catch(() => {});

    return this.getFinancialProfile(userId);
  }

  // ── Helpers ────────────────────────────────────────────────────

  private assertSimulationAllowed() {
    const env = this.config.get<string>('NODE_ENV', 'development');
    if (env === 'production') {
      throw new ForbiddenException(
        'Simulação de verificação não disponível em produção.',
      );
    }
  }

  private humanLabel(status: KycStatus): string {
    const map: Record<KycStatus, string> = {
      PENDING: 'Verificação não iniciada',
      SUBMITTED: 'Em análise',
      UNDER_REVIEW: 'Em revisão detalhada',
      APPROVED: 'Aprovado para valor protegido',
      REJECTED: 'Verificação não aprovada',
    };
    return map[status] ?? status;
  }

  private humanMessage(status: KycStatus, pendingRequirements: string[]): string {
    if (status === KycStatus.APPROVED) {
      return 'Você está verificado e pode usar o valor protegido.';
    }
    if (status === KycStatus.SUBMITTED || status === KycStatus.UNDER_REVIEW) {
      return 'Seus dados estão em análise. Você será notificado quando a revisão for concluída.';
    }
    if (status === KycStatus.REJECTED) {
      return 'Sua verificação não foi aprovada. Corrija os dados e tente novamente.';
    }
    // PENDING
    if (pendingRequirements.length > 0) {
      return `Para usar valor protegido, complete a verificação financeira. Pendente: ${pendingRequirements.join(', ')}.`;
    }
    return 'Para usar valor protegido, complete a verificação financeira.';
  }

  private buildPendingRequirements(user: {
    document: string | null;
    phone: string | null;
    kycStatus: KycStatus;
    profile: { fullName: string; birthDate: Date | null } | null;
    financialProfile: { acceptedFinancialTermsAt: Date | null; verificationLevel: FinancialVerificationLevel } | null;
  }): string[] {
    if (user.kycStatus === KycStatus.APPROVED) return [];
    const pending: string[] = [];
    if (!user.profile?.fullName) pending.push('nome completo');
    if (!user.document) pending.push('CPF');
    if (!user.profile?.birthDate) pending.push('data de nascimento');
    if (!user.phone) pending.push('telefone');
    if (!user.financialProfile?.acceptedFinancialTermsAt) pending.push('aceitar termos de valor protegido');
    return pending;
  }
}
