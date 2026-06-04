import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { BlockchainRecordsService } from './blockchain-records.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

// TODO: Fase 4 — adicionar endpoint para registrar acordo em blockchain

@Controller('blockchain-records')
@UseGuards(JwtAuthGuard)
export class BlockchainRecordsController {
  constructor(private readonly service: BlockchainRecordsService) {}

  @Get(':agreementId')
  findByAgreement(@Param('agreementId') agreementId: string) {
    return this.service.findByAgreement(agreementId);
  }
}
