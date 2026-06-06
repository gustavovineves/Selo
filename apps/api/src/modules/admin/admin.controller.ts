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
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminJwtGuard, AdminContext } from '../../common/guards/admin-jwt.guard';
import { CurrentAdmin } from '../../common/decorators/current-admin.decorator';
import { AdminResolveReleaseDto } from './dto/admin-resolve-release.dto';
import { AdminResolveRefundDto } from './dto/admin-resolve-refund.dto';
import { AdminListDisputesDto } from './dto/admin-list-disputes.dto';

@Controller('admin')
@UseGuards(AdminJwtGuard)
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
    @CurrentAdmin() admin: AdminContext,
    @Param('id') id: string,
    @Body() dto: AdminResolveReleaseDto,
  ) {
    return this.service.resolveRelease(admin.id, id, dto);
  }

  @Post('disputes/:id/resolve-refund')
  @HttpCode(HttpStatus.OK)
  resolveRefund(
    @CurrentAdmin() admin: AdminContext,
    @Param('id') id: string,
    @Body() dto: AdminResolveRefundDto,
  ) {
    return this.service.resolveRefund(admin.id, id, dto);
  }
}
