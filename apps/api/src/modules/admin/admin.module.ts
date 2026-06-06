import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AdminController } from './admin.controller';
import { AdminAuthController } from './admin-auth.controller';
import { AdminService } from './admin.service';
import { AdminAuthService } from './admin-auth.service';
import { AdminJwtGuard } from '../../common/guards/admin-jwt.guard';
import { AdminJwtStrategy } from '../../common/strategies/admin-jwt.strategy';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { TrustScoreModule } from '../trust-score/trust-score.module';
import { BlockchainRecordsModule } from '../blockchain-records/blockchain-records.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('ADMIN_JWT_SECRET', 'admin-jwt-secret-dev'),
        signOptions: {
          expiresIn: config.get<string>('ADMIN_JWT_EXPIRES_IN', '1d'),
        },
      }),
      inject: [ConfigService],
    }),
    AuditLogsModule,
    TrustScoreModule,
    BlockchainRecordsModule,
    NotificationsModule,
  ],
  controllers: [AdminController, AdminAuthController],
  providers: [AdminService, AdminAuthService, AdminJwtStrategy, AdminJwtGuard],
  exports: [AdminService],
})
export class AdminModule {}
