import { Injectable, NotFoundException, NotImplementedException } from '@nestjs/common';
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

  createProof(_agreementId: string) {
    // TODO: Fase 4 — gerar hash SHA256 e submeter à blockchain
    throw new NotImplementedException('Blockchain records — Fase 4');
  }

  submitToChain(_agreementId: string) {
    throw new NotImplementedException('Blockchain submission — Fase 4');
  }
}
