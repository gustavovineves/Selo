import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

// TODO: Fase 4 — expor também via painel admin com filtros avançados

@Controller('audit-logs')
@UseGuards(JwtAuthGuard)
export class AuditLogsController {
  constructor(private readonly service: AuditLogsService) {}

  @Get('mine')
  findMine(
    @CurrentUser() user: { id: string },
    @Query('limit') limit?: string,
  ) {
    return this.service.findByUser(user.id, limit ? parseInt(limit) : 20);
  }
}
