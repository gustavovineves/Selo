import { Injectable, NotFoundException, NotImplementedException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BlockchainRecordsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByAgreement(agreementId: string) {
    const record = await this.prisma.blockchainRecord.findUnique({
      where: { agreementId },
    });
    if (!record) throw new NotFoundException('Blockchain record not found');
    return record;
  }

  // Cria registro local pendente. Submissão real à blockchain: Fase 6.
  async createPending(
    agreementId: string,
    proofData: Record<string, unknown>,
  ): Promise<void> {
    await this.prisma.blockchainRecord.upsert({
      where: { agreementId },
      create: {
        agreementId,
        proofData: proofData as Prisma.InputJsonValue,
        status: 'PENDING',
      },
      update: {
        proofData: proofData as Prisma.InputJsonValue,
      },
    });
  }

  createProof(_agreementId: string) {
    throw new NotImplementedException('Blockchain proof generation — Fase 6');
  }

  submitToChain(_agreementId: string) {
    throw new NotImplementedException('Blockchain submission — Fase 6');
  }
}
