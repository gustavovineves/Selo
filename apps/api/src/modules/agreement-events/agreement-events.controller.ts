import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AgreementEventsService } from './agreement-events.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('agreements/:agreementId/events')
@UseGuards(JwtAuthGuard)
export class AgreementEventsController {
  constructor(private readonly service: AgreementEventsService) {}

  @Get()
  findAll(
    @CurrentUser() user: { id: string },
    @Param('agreementId') agreementId: string,
  ) {
    return this.service.findAllByAgreement(user.id, agreementId);
  }
}
