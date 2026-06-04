import { Module } from '@nestjs/common';
import { ReceivingDestinationsController } from './receiving-destinations.controller';
import { ReceivingDestinationsService } from './receiving-destinations.service';

@Module({
  controllers: [ReceivingDestinationsController],
  providers: [ReceivingDestinationsService],
  exports: [ReceivingDestinationsService],
})
export class ReceivingDestinationsModule {}
