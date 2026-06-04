import {
  Controller, Get, Post, Patch, Param, Body, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { AgreementsService } from './agreements.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateAgreementDto } from './dto/create-agreement.dto';
import { ListAgreementsDto } from './dto/list-agreements.dto';

@Controller('agreements')
@UseGuards(JwtAuthGuard)
export class AgreementsController {
  constructor(private readonly agreementsService: AgreementsService) {}

  @Get()
  findAll(
    @CurrentUser() user: { id: string },
    @Query() query: ListAgreementsDto,
  ) {
    return this.agreementsService.findAllByUser(user.id, query);
  }

  @Get(':id')
  findOne(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.agreementsService.findOne(user.id, id);
  }

  @Post()
  create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateAgreementDto,
  ) {
    return this.agreementsService.create(user.id, dto);
  }

  @Patch(':id/accept')
  @HttpCode(HttpStatus.OK)
  accept(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.agreementsService.accept(user.id, id);
  }

  @Patch(':id/complete')
  @HttpCode(HttpStatus.OK)
  complete(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.agreementsService.complete(user.id, id);
  }

  @Patch(':id/cancel')
  @HttpCode(HttpStatus.OK)
  cancel(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.agreementsService.cancel(user.id, id);
  }
}
