import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ReceivingDestinationsService } from './receiving-destinations.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { CreateReceivingDestinationDto } from './dto/create-receiving-destination.dto';
import { UpdateReceivingDestinationDto } from './dto/update-receiving-destination.dto';

@Controller('receiving-destinations')
@UseGuards(JwtAuthGuard)
export class ReceivingDestinationsController {
  constructor(private readonly service: ReceivingDestinationsService) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateReceivingDestinationDto,
  ) {
    return this.service.create(user.id, dto);
  }

  // IMPORTANT: 'me' must be declared BEFORE ':id' to avoid Express
  // matching 'me' as an :id parameter value.
  @Get('me')
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.service.findAllByUser(user.id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateReceivingDestinationDto,
  ) {
    return this.service.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.remove(user.id, id);
  }
}
