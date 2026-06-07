import {
  Controller,
  Post,
  Param,
  Body,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { FitbankWebhookDto } from './dto/fitbank-webhook.dto';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}

  // Endpoint de dev/local: simula confirmação do parceiro financeiro (Fitbank/BaaS)
  @Post(':id/simulate-confirmation')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  simulateConfirmation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') paymentIntentId: string,
  ) {
    return this.service.simulateConfirmation(user.id, paymentIntentId);
  }

  // Webhook Fitbank / Pix Sandbox — sem autenticação JWT (autenticado por assinatura HMAC)
  // Para produção: habilitar rawBody:true em main.ts para assinatura HMAC exata.
  // Em sandbox, JSON.stringify(body) é suficiente para validação de assinatura.
  @Post('webhooks/fitbank')
  @HttpCode(HttpStatus.OK)
  handleFitbankWebhook(
    @Headers() headers: Record<string, string>,
    @Body() body: FitbankWebhookDto,
  ) {
    return this.service.handleFitbankWebhook(headers, JSON.stringify(body), body);
  }
}
