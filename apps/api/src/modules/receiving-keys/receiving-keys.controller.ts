import { Controller, Get, Post, Delete, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ReceivingKeysService } from './receiving-keys.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateReceivingKeyDto } from './dto/create-receiving-key.dto';

@Controller('receiving-keys')
@UseGuards(JwtAuthGuard)
export class ReceivingKeysController {
  constructor(private readonly service: ReceivingKeysService) {}

  @Get()
  findAll(@CurrentUser() user: { id: string }) {
    return this.service.findAllByUser(user.id);
  }

  @Post()
  create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateReceivingKeyDto,
  ) {
    return this.service.create(user.id, dto);
  }

  @Patch(':id/default')
  setDefault(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    return this.service.setDefault(user.id, id);
  }

  @Delete(':id')
  remove(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.service.remove(user.id, id);
  }
}
