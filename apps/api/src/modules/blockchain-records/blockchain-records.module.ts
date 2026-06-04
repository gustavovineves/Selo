import { Module } from '@nestjs/common';
import { BlockchainRecordsController } from './blockchain-records.controller';
import { BlockchainRecordsService } from './blockchain-records.service';

@Module({
  controllers: [BlockchainRecordsController],
  providers: [BlockchainRecordsService],
  exports: [BlockchainRecordsService],
})
export class BlockchainRecordsModule {}
