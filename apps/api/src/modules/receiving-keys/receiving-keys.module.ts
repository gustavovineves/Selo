import { Module } from '@nestjs/common';
import { ReceivingKeysController } from './receiving-keys.controller';
import { ReceivingKeysService } from './receiving-keys.service';

@Module({
  controllers: [ReceivingKeysController],
  providers: [ReceivingKeysService],
  exports: [ReceivingKeysService],
})
export class ReceivingKeysModule {}
