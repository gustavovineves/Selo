import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { FinancialGuaranteesService } from './financial-guarantees.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateFinancialGuaranteeDto } from './dto/create-financial-guarantee.dto';

@Controller('financial-guarantees')
@UseGuards(JwtAuthGuard)
export class FinancialGuaranteesController {
  constructor(private readonly service: FinancialGuaranteesService) {}

  @Get(':id')
  findOne(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.service.findOne(user.id, id);
  }

  @Post()
  create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateFinancialGuaranteeDto,
  ) {
    return this.service.create(user.id, dto);
  }

  @Patch(':id/release')
  release(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.service.release(user.id, id);
  }

  @Patch(':id/revert')
  revert(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.service.revert(user.id, id);
  }
}
