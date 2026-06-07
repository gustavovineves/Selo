import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BlockchainRecordsController } from './blockchain-records.controller';
import { BlockchainRecordsService } from './blockchain-records.service';
import { SimulatedBlockchainProofProvider } from './providers/simulated-blockchain-proof.provider';
import { TestnetBlockchainProofProvider } from './providers/testnet-blockchain-proof.provider';
import { BLOCKCHAIN_PROOF_PROVIDER_TOKEN } from './providers/blockchain-proof-provider.interface';

const blockchainProofProviderFactory = {
  provide: BLOCKCHAIN_PROOF_PROVIDER_TOKEN,
  inject: [ConfigService],
  useFactory: (config: ConfigService) => {
    const providerName = config.get<string>('BLOCKCHAIN_PROVIDER', 'simulated');
    if (providerName === 'testnet') {
      return new TestnetBlockchainProofProvider(config);
    }
    return new SimulatedBlockchainProofProvider(config);
  },
};

@Module({
  imports: [ConfigModule],
  controllers: [BlockchainRecordsController],
  providers: [
    blockchainProofProviderFactory,
    BlockchainRecordsService,
  ],
  exports: [BlockchainRecordsService],
})
export class BlockchainRecordsModule {}
