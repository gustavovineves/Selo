import { Module } from '@nestjs/common';
import { AgreementsController } from './agreements.controller';
import { AgreementsService } from './agreements.service';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { TrustScoreModule } from '../trust-score/trust-score.module';
import { BlockchainRecordsModule } from '../blockchain-records/blockchain-records.module';
import { FinancialGuaranteesModule } from '../financial-guarantees/financial-guarantees.module';

@Module({
  imports: [
    AuditLogsModule,
    TrustScoreModule,
    BlockchainRecordsModule,
    FinancialGuaranteesModule,
  ],
  controllers: [AgreementsController],
  providers: [AgreementsService],
  exports: [AgreementsService],
})
export class AgreementsModule {}
