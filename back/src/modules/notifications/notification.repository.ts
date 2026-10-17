import { prisma } from '../../config/prisma';
import type { Notification, PushSubscription, Prisma } from '@prisma/client';
import type { CreateNotificationDto, NotificationFilterDto, SavePushSubscriptionDto } from './notification.schema';
import { AppError } from '../../core/errors/app-error';

export class NotificationRepository {
  async create(schoolId: string, data: CreateNotificationDto): Promise<Notification> {
    return prisma.notification.create({
      data: {
        schoolId,
        userId: data.userId,
        title: data.title,
        message: data.message,
        type: data.type,
        link: data.link,
      },
    });
  }

  async createMany(
    schoolId: string,
    notifications: CreateNotificationDto[],
  ): Promise<{ count: number }> {
    if (notifications.length === 0) {
      return { count: 0 };
    }

    return prisma.notification.createMany({
      data: notifications.map((n) => ({
        schoolId,
        userId: n.userId,
        title: n.title,
        message: n.message,
        type: n.type,
        link: n.link,
      })),
    });
  }

  async findByUser(
    schoolId: string,
    userId: string,
    filters: NotificationFilterDto,
  ): Promise<{ list: Notification[]; total: number; unreadCount: number }> {
    const whereClause: Prisma.NotificationWhereInput = {
      schoolId,
      userId,
      ...(filters.isRead !== undefined && { isRead: filters.isRead }),
    };

    const [list, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      prisma.notification.count({ where: whereClause }),
      prisma.notification.count({
        where: {
          schoolId,
          userId,
          isRead: false,
        },
      }),
    ]);

    return { list, total, unreadCount };
  }

  async markAsRead(
    schoolId: string,
    userId: string,
    notificationId: string,
  ): Promise<Notification> {
    const existing = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        schoolId,
        userId,
      },
    });

    if (!existing) {
      throw new AppError('Notificación no encontrada', 404);
    }

    return prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(schoolId: string, userId: string): Promise<{ count: number }> {
    return prisma.notification.updateMany({
      where: {
        schoolId,
        userId,
        isRead: false,
      },
      data: { isRead: true },
    });
  }

  async delete(
    schoolId: string,
    userId: string,
    notificationId: string,
  ): Promise<Notification> {
    const existing = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        schoolId,
        userId,
      },
    });

    if (!existing) {
      throw new AppError('Notificación no encontrada', 404);
    }

    return prisma.notification.delete({
      where: { id: notificationId },
    });
  }

  async upsertPushSubscription(
    schoolId: string,
    userId: string,
    data: SavePushSubscriptionDto,
  ): Promise<PushSubscription> {
    return prisma.pushSubscription.upsert({
      where: { endpoint: data.endpoint },
      create: {
        schoolId,
        userId,
        endpoint: data.endpoint,
        p256dh: data.keys.p256dh,
        auth: data.keys.auth,
        userAgent: data.userAgent,
      },
      update: {
        schoolId,
        userId,
        p256dh: data.keys.p256dh,
        auth: data.keys.auth,
        userAgent: data.userAgent,
      },
    });
  }

  async deletePushSubscription(endpoint: string): Promise<void> {
    await prisma.pushSubscription.deleteMany({
      where: { endpoint },
    });
  }

  async findPushSubscriptionsByUser(
    schoolId: string,
    userId: string,
  ): Promise<PushSubscription[]> {
    return prisma.pushSubscription.findMany({
      where: { schoolId, userId },
    });
  }

  async findPushSubscriptionsByUsers(
    schoolId: string,
    userIds: string[],
  ): Promise<PushSubscription[]> {
    return prisma.pushSubscription.findMany({
      where: {
        schoolId,
        userId: { in: userIds },
      },
    });
  }
}
