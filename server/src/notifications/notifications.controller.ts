import {
  Controller,
  Get,
  Put,
  Delete,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
  CurrentUser,
  type CurrentUserData,
} from '../common/decorators/current-user.decorator';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  async getNotifications(
    @CurrentUser() user: CurrentUserData,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 5;
    const skipNum = skip ? parseInt(skip, 10) : 0;
    return this.notificationsService.getUserNotifications(
      user.userId,
      limitNum,
      skipNum,
    );
  }

  @Get('unread-count')
  async getUnreadCount(@CurrentUser() user: CurrentUserData) {
    const count = await this.notificationsService.getUnreadCount(user.userId);
    return { count };
  }

  @Get(':id')
  async getNotificationById(
    @CurrentUser() user: CurrentUserData,
    @Param('id') notificationId: string,
  ) {
    return this.notificationsService.getNotificationById(
      notificationId,
      user.userId,
    );
  }

  @Put(':id/read')
  @HttpCode(HttpStatus.OK)
  async markAsRead(
    @CurrentUser() user: CurrentUserData,
    @Param('id') notificationId: string,
  ) {
    return this.notificationsService.markAsRead(notificationId, user.userId);
  }

  @Put('mark-all-read')
  @HttpCode(HttpStatus.OK)
  async markAllAsRead(@CurrentUser() user: CurrentUserData) {
    return this.notificationsService.markAllAsRead(user.userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteNotification(
    @CurrentUser() user: CurrentUserData,
    @Param('id') notificationId: string,
  ) {
    await this.notificationsService.deleteNotification(
      notificationId,
      user.userId,
    );
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async clearAll(@CurrentUser() user: CurrentUserData) {
    await this.notificationsService.clearAll(user.userId);
  }
}
