import { Controller, Get, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ReceivingDestinationsService } from './receiving-destinations.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateReceivingDestinationDto } from './dto/create-receiving-destination.dto';

@Controller('receiving-destinations')
@UseGuards(JwtAuthGuard)
export class ReceivingDestinationsController {
  constructor(private readonly service: ReceivingDestinationsService) {}

  @Get()
  findAll(@CurrentUser() user: { id: string }) {
    return this.service.findAllByUser(user.id);
  }

  @Post()
  create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateReceivingDestinationDto,
  ) {
    return this.service.create(user.id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.service.remove(user.id, id);
  }
}
