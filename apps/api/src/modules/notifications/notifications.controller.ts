import { Controller, Get, Post, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { NotificationType } from '@prisma/client';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  findAll(
    @CurrentUser() user: { id: string },
    @Query('unreadOnly') unreadOnly?: string,
    @Query('read') read?: string,
    @Query('type') type?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const showUnreadOnly = unreadOnly === 'true' || read === 'false';
    return this.service.findAllByUser(user.id, {
      unreadOnly: showUnreadOnly,
      type: type as NotificationType | undefined,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? Math.min(parseInt(limit, 10), 100) : 30,
    });
  }

  // Rota específica antes de :id/read para evitar captura errada
  @Get('unread-count')
  getUnreadCount(@CurrentUser() user: { id: string }) {
    return this.service.getUnreadCount(user.id);
  }

  // Rota específica antes de :id para evitar captura errada
  @Post('read-all')
  @Patch('read-all')
  markAllRead(@CurrentUser() user: { id: string }) {
    return this.service.markAllRead(user.id);
  }

  @Post(':id/read')
  @Patch(':id/read')
  markRead(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.service.markRead(user.id, id);
  }
}
