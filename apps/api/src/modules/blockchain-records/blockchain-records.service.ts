import { Injectable, NotFoundException, NotImplementedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

// TODO: Fase 4 — integrar com ethers.js ou web3.js para registro real em blockchain

@Injectable()
export class BlockchainRecordsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByAgreement(agreementId: string) {
    const record = await this.prisma.blockchainRecord.findUnique({ where: { agreementId } });
    if (!record) throw new NotFoundException('Blockchain record not found');
    return record;
  }

  async createProof(agreementId: string) {
    const agreement = await this.prisma.agreement.findUnique({ where: { id: agreementId } });
    if (!agreement) throw new NotFoundException('Agreement not found');

    const proofData = {
      agreementId,
      title: agreement.title,
      terms: agreement.terms,
      createdAt: agreement.createdAt,
      timestamp: Date.now(),
    };

    const proofHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(proofData))
      .digest('hex');

    // TODO: Fase 4 — submeter proofHash para smart contract na blockchain
    return this.prisma.blockchainRecord.upsert({
      where: { agreementId },
      create: { agreementId, proofData, status: 'PENDING', network: 'ethereum-testnet' },
      update: { proofData, status: 'PENDING' },
    });
  }

  async submitToChain(_agreementId: string) {
    throw new NotImplementedException('Blockchain submission available in Phase 4');
  }
}
