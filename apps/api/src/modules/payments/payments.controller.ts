import { Controller, Post, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}

  // Endpoint de dev/local: simula confirmação do parceiro financeiro (Fitbank/BaaS)
  @Post(':id/simulate-confirmation')
  @HttpCode(HttpStatus.OK)
  simulateConfirmation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') paymentIntentId: string,
  ) {
    return this.service.simulateConfirmation(user.id, paymentIntentId);
  }
}
