import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { BlockchainRecordsService } from './blockchain-records.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('blockchain-records')
@UseGuards(JwtAuthGuard)
export class BlockchainRecordsController {
  constructor(private readonly service: BlockchainRecordsService) {}

  @Get(':agreementId')
  findByAgreement(
    @CurrentUser() user: { id: string },
    @Param('agreementId') agreementId: string,
  ) {
    return this.service.getProofsForUser(user.id, agreementId);
  }
}
