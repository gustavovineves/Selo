import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminTokenGuard } from '../../common/guards/admin-token.guard';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { TrustScoreModule } from '../trust-score/trust-score.module';
import { BlockchainRecordsModule } from '../blockchain-records/blockchain-records.module';

@Module({
  imports: [AuditLogsModule, TrustScoreModule, BlockchainRecordsModule],
  controllers: [AdminController],
  providers: [AdminService, AdminTokenGuard],
  exports: [AdminService],
})
export class AdminModule {}
