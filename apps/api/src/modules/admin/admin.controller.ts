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

  // ── Usuários ─────────────────────────────────────────────────

  @Get('users')
  listUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.service.listUsers({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? Math.min(parseInt(limit, 10), 100) : 20,
      status,
    });
  }

  @Get('users/:id')
  getUser(@Param('id') id: string) {
    return this.service.getUser(id);
  }

  // ── Acordos ──────────────────────────────────────────────────

  @Get('agreements')
  listAgreements(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
  ) {
    return this.service.listAgreements({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? Math.min(parseInt(limit, 10), 100) : 20,
      status,
      type,
    });
  }

  @Get('agreements/:id')
  getAgreement(@Param('id') id: string) {
    return this.service.getAgreement(id);
  }
}
