import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { TrustScoreService } from './trust-score.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('trust-score')
@UseGuards(JwtAuthGuard)
export class TrustScoreController {
  constructor(private readonly service: TrustScoreService) {}

  @Get('me')
  getMyScore(@CurrentUser() user: { id: string }) {
    return this.service.findByUser(user.id);
  }

  @Get(':userId')
  getByUser(@Param('userId') userId: string) {
    return this.service.findByUser(userId);
  }
}
