import { Injectable, Inject, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { BlockchainNetwork, Prisma } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { sanitizeForProof } from '../../common/utils/sensitive-proof-sanitizer.util';
import {
  BLOCKCHAIN_PROOF_PROVIDER_TOKEN,
  IBlockchainProofProvider,
} from './providers/blockchain-proof-provider.interface';

// ── Public shape returned to users ──────────────────────────────────────
export interface PublicProof {
  id: string;
  eventType: string | null;
  status: string;
  proofHashShort: string | null;
  txHashShort: string | null;
  network: string;
  provider: string;
  createdAt: Date;
  submittedAt: Date | null;
  confirmedAt: Date | null;
  humanMessage: string;
}

// ── Full shape for admin ─────────────────────────────────────────────────
export interface AdminProof extends PublicProof {
  proofHash: string | null;
  txHash: string | null;
  errorMessage: string | null;
  retryCount: number;
  failedAt: Date | null;
}

@Injectable()
export class BlockchainRecordsService {
  private readonly logger = new Logger(BlockchainRecordsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(BLOCKCHAIN_PROOF_PROVIDER_TOKEN)
    private readonly provider: IBlockchainProofProvider,
  ) {}

  // ── Core: create a proof record for an event ──────────────────────────

  async createProof(
    agreementId: string,
    eventType: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const sanitized = sanitizeForProof(payload) as Record<string, unknown>;

    try {
      const result = await this.provider.submitProof(eventType, sanitized);

      const network = this.resolveNetwork(result.network);

      await this.prisma.blockchainRecord.create({
        data: {
          agreementId,
          eventType,
          network,
          proofHash: result.proofHash,
          proofData: sanitized as Prisma.InputJsonValue,
          txHash: result.txHash,
          status: result.status,
          submittedAt: result.submittedAt,
          errorMessage: result.errorMessage,
          contractAddress: this.config.get<string>('BLOCKCHAIN_CONTRACT_ADDRESS') ?? null,
        },
      });
    } catch (err) {
      this.logger.error(
        `BlockchainRecord creation failed for agreement=${agreementId} event=${eventType}: ${(err as Error).message}`,
      );
    }
  }

  // ── Backward-compatible alias used before Fase 26 ─────────────────────
  async createPending(
    agreementId: string,
    proofData: Record<string, unknown>,
  ): Promise<void> {
    const eventType = (proofData.event as string | undefined) ?? 'UNKNOWN';
    await this.createProof(agreementId, eventType, proofData);
  }

  // ── User-facing: returns safe proof list for an agreement ─────────────

  async getProofsForUser(userId: string, agreementId: string): Promise<PublicProof[]> {
    const agreement = await this.prisma.agreement.findUnique({
      where: { id: agreementId },
      include: { participants: { select: { userId: true } } },
    });

    if (!agreement) throw new NotFoundException('Acordo não encontrado.');

    const isParticipant = agreement.participants.some((p) => p.userId === userId);
    if (!isParticipant) {
      throw new ForbiddenException('Você não tem acesso às provas deste acordo.');
    }

    const records = await this.prisma.blockchainRecord.findMany({
      where: { agreementId },
      orderBy: { createdAt: 'asc' },
    });

    return records.map((r) => ({
      id: r.id,
      eventType: r.eventType,
      status: r.status,
      proofHashShort: r.proofHash ? r.proofHash.slice(0, 16) + '…' : null,
      txHashShort: r.txHash ? r.txHash.slice(0, 18) + '…' : null,
      network: r.network,
      provider: this.provider.providerName,
      createdAt: r.createdAt,
      submittedAt: r.submittedAt,
      confirmedAt: r.confirmedAt,
      humanMessage: this.buildHumanMessage(r.status, r.eventType),
    }));
  }

  // ── Admin-facing: full proof list for an agreement ────────────────────

  async getProofsForAdmin(agreementId: string): Promise<AdminProof[]> {
    const agreement = await this.prisma.agreement.findUnique({
      where: { id: agreementId },
    });

    if (!agreement) throw new NotFoundException('Acordo não encontrado.');

    const records = await this.prisma.blockchainRecord.findMany({
      where: { agreementId },
      orderBy: { createdAt: 'asc' },
    });

    return records.map((r) => ({
      id: r.id,
      eventType: r.eventType,
      status: r.status,
      proofHash: r.proofHash,
      proofHashShort: r.proofHash ? r.proofHash.slice(0, 16) + '…' : null,
      txHash: r.txHash,
      txHashShort: r.txHash ? r.txHash.slice(0, 18) + '…' : null,
      network: r.network,
      provider: this.provider.providerName,
      createdAt: r.createdAt,
      submittedAt: r.submittedAt,
      confirmedAt: r.confirmedAt,
      errorMessage: r.errorMessage,
      retryCount: r.retryCount,
      failedAt: r.failedAt,
      humanMessage: this.buildHumanMessage(r.status, r.eventType),
    }));
  }

  // ── Legacy single-record lookup (by agreementId) ───────────────────────
  async findByAgreement(agreementId: string) {
    const records = await this.prisma.blockchainRecord.findMany({
      where: { agreementId },
      orderBy: { createdAt: 'desc' },
    });
    if (!records.length) throw new NotFoundException('Blockchain record not found');
    return records;
  }

  // ── Helpers ────────────────────────────────────────────────────────────

  private buildHumanMessage(status: string, eventType: string | null): string {
    const eventLabel = this.eventLabel(eventType);
    switch (status) {
      case 'CONFIRMED':
        return `${eventLabel} registrado e confirmado. Este registro comprova que o evento existia neste momento.`;
      case 'SUBMITTED':
        return `${eventLabel} registrado com prova de integridade. O dinheiro não fica na blockchain.`;
      case 'PENDING':
        return `${eventLabel} aguardando registro de prova.`;
      case 'FAILED':
        return `Falha ao registrar prova para ${eventLabel}. Não afeta o fluxo financeiro.`;
      default:
        return 'Registro de prova do combinado.';
    }
  }

  private eventLabel(eventType: string | null): string {
    const labels: Record<string, string> = {
      AGREEMENT_CREATED: 'Criação do combinado',
      AGREEMENT_ACCEPTED: 'Aceite do combinado',
      AGREEMENT_REJECTED: 'Recusa do combinado',
      AGREEMENT_CANCELLED: 'Cancelamento do combinado',
      DISPUTE_OPENED: 'Abertura de contestação',
      DISPUTE_RESOLVED: 'Resolução de contestação',
      PAYOUT_COMPLETED: 'Liberação do valor',
      DUAL_CONFIRMATION_PAYOUT: 'Liberação por dupla confirmação',
      REFUND_COMPLETED: 'Reembolso registrado',
      PAYMENT_CONFIRMED: 'Pagamento confirmado',
      FUNDS_LOCKED: 'Valor protegido',
    };
    return (eventType && labels[eventType]) ?? 'Evento do combinado';
  }

  private resolveNetwork(networkName: string): BlockchainNetwork {
    const map: Record<string, BlockchainNetwork> = {
      polygon_amoy: BlockchainNetwork.POLYGON_TESTNET,
      polygon_testnet: BlockchainNetwork.POLYGON_TESTNET,
      ethereum_sepolia: BlockchainNetwork.ETHEREUM_TESTNET,
      ethereum_testnet: BlockchainNetwork.ETHEREUM_TESTNET,
      polygon_mainnet: BlockchainNetwork.POLYGON_MAINNET,
      ethereum_mainnet: BlockchainNetwork.ETHEREUM_MAINNET,
    };
    return map[networkName.toLowerCase()] ?? BlockchainNetwork.POLYGON_TESTNET;
  }
}
