import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { AdminService } from './admin.service';
import { AdminTokenGuard, AdminContext } from '../../common/guards/admin-token.guard';
import { AdminResolveReleaseDto } from './dto/admin-resolve-release.dto';
import { AdminResolveRefundDto } from './dto/admin-resolve-refund.dto';
import { AdminListDisputesDto } from './dto/admin-list-disputes.dto';

@Controller('admin')
@UseGuards(AdminTokenGuard)
export class AdminController {
  constructor(private readonly service: AdminService) {}

  // ── Dashboard ─────────────────────────────────────────────────

  @Get('health')
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('stats')
  getStats() {
    return this.service.getStats();
  }

  // ── Disputas ─────────────────────────────────────────────────

  @Get('disputes')
  listDisputes(@Query() query: AdminListDisputesDto) {
    return this.service.listDisputes(query);
  }

  @Get('disputes/:id')
  getDispute(@Param('id') id: string) {
    return this.service.getDispute(id);
  }

  @Post('disputes/:id/resolve-release')
  @HttpCode(HttpStatus.OK)
  resolveRelease(
    @Req() req: Request & { adminContext: AdminContext },
    @Param('id') id: string,
    @Body() dto: AdminResolveReleaseDto,
  ) {
    return this.service.resolveRelease(req.adminContext.id, id, dto);
  }

  @Post('disputes/:id/resolve-refund')
  @HttpCode(HttpStatus.OK)
  resolveRefund(
    @Req() req: Request & { adminContext: AdminContext },
    @Param('id') id: string,
    @Body() dto: AdminResolveRefundDto,
  ) {
    return this.service.resolveRefund(req.adminContext.id, id, dto);
  }
}
