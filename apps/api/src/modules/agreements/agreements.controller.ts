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
import { AgreementsService } from './agreements.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { CreateSimpleAgreementDto } from './dto/create-simple-agreement.dto';
import { ListAgreementsDto } from './dto/list-agreements.dto';
import { CancelAgreementDto } from './dto/cancel-agreement.dto';
import { DeclineAgreementDto } from './dto/decline-agreement.dto';

@Controller('agreements')
@UseGuards(JwtAuthGuard)
export class AgreementsController {
  constructor(private readonly service: AgreementsService) {}

  @Post('simple')
  createSimple(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSimpleAgreementDto,
  ) {
    return this.service.createSimple(user.id, dto);
  }

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListAgreementsDto,
  ) {
    return this.service.findAllByUser(user.id, query);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.findOne(user.id, id);
  }

  @Post(':id/accept')
  @HttpCode(HttpStatus.OK)
  accept(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.accept(user.id, id);
  }

  @Post(':id/decline')
  @HttpCode(HttpStatus.OK)
  decline(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: DeclineAgreementDto,
  ) {
    return this.service.decline(user.id, id, dto.reason);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CancelAgreementDto,
  ) {
    return this.service.cancel(user.id, id, dto.reason);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  complete(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.complete(user.id, id);
  }
}
