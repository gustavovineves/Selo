import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { DisputesService } from './disputes.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';

@Controller('disputes')
@UseGuards(JwtAuthGuard)
export class DisputesController {
  constructor(private readonly service: DisputesService) {}

  @Get(':id')
  findOne(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.service.findOne(user.id, id);
  }

  @Post()
  create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateDisputeDto,
  ) {
    return this.service.create(user.id, dto);
  }

  @Patch(':id/resolve')
  resolve(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: ResolveDisputeDto,
  ) {
    return this.service.resolve(user.id, id, dto);
  }
}
