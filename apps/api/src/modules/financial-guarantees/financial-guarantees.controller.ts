import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { FinancialGuaranteesService } from './financial-guarantees.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

@Controller('financial-guarantees')
@UseGuards(JwtAuthGuard)
export class FinancialGuaranteesController {
  constructor(private readonly service: FinancialGuaranteesService) {}

  @Get(':id')
  findById(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.findById(user.id, id);
  }
}
