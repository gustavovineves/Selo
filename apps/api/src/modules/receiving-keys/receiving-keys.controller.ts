import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ReceivingKeysService } from './receiving-keys.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { CreateReceivingKeyDto } from './dto/create-receiving-key.dto';

@Controller('receiving-keys')
export class ReceivingKeysController {
  constructor(private readonly service: ReceivingKeysService) {}

  // ── Protected ──────────────────────────────────────────────────

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateReceivingKeyDto,
  ) {
    return this.service.create(user.id, dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.service.findActive(user.id);
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  findHistory(@CurrentUser() user: AuthenticatedUser) {
    return this.service.findHistory(user.id);
  }

  @Delete('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  remove(@CurrentUser() user: AuthenticatedUser) {
    return this.service.remove(user.id);
  }

  // ── Public ─────────────────────────────────────────────────────

  @Get('check/:key')
  check(@Param('key') key: string) {
    return this.service.checkAvailability(key);
  }

  @Get('resolve/:key')
  resolve(@Param('key') key: string) {
    return this.service.resolve(key);
  }
}
