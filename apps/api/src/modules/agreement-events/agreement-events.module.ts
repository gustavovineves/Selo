import { Module } from '@nestjs/common';
import { AgreementEventsController } from './agreement-events.controller';
import { AgreementEventsService } from './agreement-events.service';

@Module({
  controllers: [AgreementEventsController],
  providers: [AgreementEventsService],
  exports: [AgreementEventsService],
})
export class AgreementEventsModule {}
