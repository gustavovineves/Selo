import { Controller, Get, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';

@Controller()
export class FeedbackController {
  constructor(
    private readonly feedbackService: FeedbackService,
    private readonly config: ConfigService,
  ) {}

  // GET /api/v1/health — público, sem autenticação
  @Get('health')
  health() {
    return {
      status: 'ok',
      version: '1.0.0-beta',
      env: this.config.get<string>('NODE_ENV', 'development'),
      timestamp: new Date().toISOString(),
      mode: 'sandbox',
      note: 'Ambiente de teste — nenhum dinheiro real é movimentado.',
    };
  }

  // POST /api/v1/feedback — autenticado
  @Post('feedback')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  submitFeedback(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateFeedbackDto,
  ) {
    return this.feedbackService.submit(user.id, dto);
  }
}
