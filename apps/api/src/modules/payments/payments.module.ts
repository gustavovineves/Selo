import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { TrustScoreModule } from '../trust-score/trust-score.module';
import { BlockchainRecordsModule } from '../blockchain-records/blockchain-records.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PAYMENT_PROVIDER_TOKEN, IPaymentProvider } from './providers/payment-provider.interface';
import { SimulatedPaymentProvider } from './providers/simulated-payment.provider';
import { FitbankSandboxPaymentProvider } from './providers/fitbank-sandbox-payment.provider';

@Module({
  imports: [ConfigModule, AuditLogsModule, TrustScoreModule, BlockchainRecordsModule, NotificationsModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    SimulatedPaymentProvider,
    FitbankSandboxPaymentProvider,
    {
      provide: PAYMENT_PROVIDER_TOKEN,
      useFactory: (config: ConfigService): IPaymentProvider => {
        const providerEnv = config.get<string>('PAYMENT_PROVIDER', 'simulated');
        const realCallsEnabled =
          config.get<string>('FITBANK_ENABLE_REAL_CALLS', 'false') === 'true';

        if (providerEnv === 'fitbank_sandbox' && !realCallsEnabled) {
          return new FitbankSandboxPaymentProvider();
        }
        return new SimulatedPaymentProvider();
      },
      inject: [ConfigService],
    },
  ],
  exports: [PaymentsService, PAYMENT_PROVIDER_TOKEN],
})
export class PaymentsModule {}
