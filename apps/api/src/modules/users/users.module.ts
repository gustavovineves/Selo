import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { FinancialProfileService } from './financial-profile.service';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { TrustScoreModule } from '../trust-score/trust-score.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [ConfigModule, AuditLogsModule, TrustScoreModule, NotificationsModule],
  controllers: [UsersController],
  providers: [UsersService, FinancialProfileService],
  exports: [UsersService, FinancialProfileService],
})
export class UsersModule {}
