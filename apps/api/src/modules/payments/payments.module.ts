import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { TrustScoreModule } from '../trust-score/trust-score.module';
import { BlockchainRecordsModule } from '../blockchain-records/blockchain-records.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AuditLogsModule, TrustScoreModule, BlockchainRecordsModule, NotificationsModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
