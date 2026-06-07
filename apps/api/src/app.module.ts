import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProfilesModule } from './modules/profiles/profiles.module';
import { ReceivingKeysModule } from './modules/receiving-keys/receiving-keys.module';
import { ReceivingDestinationsModule } from './modules/receiving-destinations/receiving-destinations.module';
import { AgreementsModule } from './modules/agreements/agreements.module';
import { AgreementEventsModule } from './modules/agreement-events/agreement-events.module';
import { FinancialGuaranteesModule } from './modules/financial-guarantees/financial-guarantees.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { PixModule } from './modules/pix/pix.module';
import { DisputesModule } from './modules/disputes/disputes.module';
import { TrustScoreModule } from './modules/trust-score/trust-score.module';
import { BlockchainRecordsModule } from './modules/blockchain-records/blockchain-records.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { AdminModule } from './modules/admin/admin.module';
import { FeedbackModule } from './modules/feedback/feedback.module';
import { validateEnv } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env', validate: validateEnv }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => [
        {
          name: 'default',
          ttl: parseInt(config.get('RATE_LIMIT_TTL', '60000')),
          limit: parseInt(config.get('RATE_LIMIT_MAX', '100')),
        },
      ],
      inject: [ConfigService],
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ProfilesModule,
    ReceivingKeysModule,
    ReceivingDestinationsModule,
    AgreementsModule,
    AgreementEventsModule,
    FinancialGuaranteesModule,
    PaymentsModule,
    PixModule,
    DisputesModule,
    TrustScoreModule,
    BlockchainRecordsModule,
    NotificationsModule,
    AuditLogsModule,
    AdminModule,
    FeedbackModule,
  ],
})
export class AppModule {}
