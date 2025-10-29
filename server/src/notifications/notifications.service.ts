import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

export interface CreateNotificationDto {
  type: 'follow' | 'unfollow' | 'like' | 'comment' | 'message' | 'share';
  content: string;
  userId: string;
  actorId?: string;
  actorName?: string;
  actorAvatar?: string;
  relatedId?: string;
}

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateNotificationDto) {
    return this.prisma.notification.create({
      data,
    });
  }

  async getUserNotifications(userId: string, limit = 5, skip = 0) {
    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: skip,
      }),
      this.prisma.notification.count({
        where: { userId },
      }),
    ]);

    return {
      notifications,
      total,
      hasMore: skip + notifications.length < total,
    };
  }

  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({
      where: {
        userId,
        read: false,
      },
    });
  }

  async markAsRead(notificationId: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId,
      },
      data: {
        read: true,
      },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: {
        userId,
        read: false,
      },
      data: {
        read: true,
      },
    });
  }

  async deleteNotification(notificationId: string, userId: string) {
    return this.prisma.notification.deleteMany({
      where: {
        id: notificationId,
        userId,
      },
    });
  }

  async clearAll(userId: string) {
    return this.prisma.notification.deleteMany({
      where: { userId },
    });
  }
}
