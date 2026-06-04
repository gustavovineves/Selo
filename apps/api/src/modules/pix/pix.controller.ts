import { Controller, Post, Body, Param, UseGuards } from '@nestjs/common';
import { PixService } from './pix.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

// TODO: Fase 2 — implementar endpoints reais de Pix (QR Code, webhook, consulta)

@Controller('pix')
@UseGuards(JwtAuthGuard)
export class PixController {
  constructor(private readonly pixService: PixService) {}

  @Post('charge/:paymentId')
  createCharge(@Param('paymentId') paymentId: string, @Body() _body: unknown) {
    return this.pixService.createCharge(paymentId);
  }

  @Post('webhook')
  webhook(@Body() payload: unknown) {
    return this.pixService.handleWebhook(payload);
  }
}
