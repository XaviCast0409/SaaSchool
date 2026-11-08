import { prisma } from '../../config/prisma';
import type { Notification, PushSubscription, Prisma } from '@prisma/client';
import type { CreateNotificationDto, NotificationFilterDto, SavePushSubscriptionDto } from './notification.schema';
import { AppError } from '../../core/errors/app-error';

export interface NotificationTarget {
  id: string;
  isStudent: boolean;
}

export class NotificationRepository {
  async create(schoolId: string, data: CreateNotificationDto): Promise<Notification> {
    const isStudent = Boolean(data.studentId);
    return prisma.notification.create({
      data: {
        schoolId,
        userId: isStudent ? null : data.userId,
        studentId: isStudent ? data.studentId : null,
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
        userId: n.studentId ? null : n.userId,
        studentId: n.studentId ? n.studentId : null,
        title: n.title,
        message: n.message,
        type: n.type,
        link: n.link,
      })),
    });
  }

  async findByUser(
    schoolId: string,
    target: NotificationTarget,
    filters: NotificationFilterDto,
  ): Promise<{ list: Notification[]; total: number; unreadCount: number }> {
    const whereClause: Prisma.NotificationWhereInput = {
      schoolId,
      ...(target.isStudent ? { studentId: target.id } : { userId: target.id }),
      ...(filters.isRead !== undefined && { isRead: filters.isRead }),
    };

    const unreadWhereClause: Prisma.NotificationWhereInput = {
      schoolId,
      ...(target.isStudent ? { studentId: target.id } : { userId: target.id }),
      isRead: false,
    };

    const [list, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      prisma.notification.count({ where: whereClause }),
      prisma.notification.count({ where: unreadWhereClause }),
    ]);

    return { list, total, unreadCount };
  }

  async markAsRead(
    schoolId: string,
    target: NotificationTarget,
    notificationId: string,
  ): Promise<Notification> {
    const existing = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        schoolId,
        ...(target.isStudent ? { studentId: target.id } : { userId: target.id }),
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

  async markAllAsRead(schoolId: string, target: NotificationTarget): Promise<{ count: number }> {
    return prisma.notification.updateMany({
      where: {
        schoolId,
        ...(target.isStudent ? { studentId: target.id } : { userId: target.id }),
        isRead: false,
      },
      data: { isRead: true },
    });
  }

  async delete(
    schoolId: string,
    target: NotificationTarget,
    notificationId: string,
  ): Promise<Notification> {
    const existing = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        schoolId,
        ...(target.isStudent ? { studentId: target.id } : { userId: target.id }),
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
    target: NotificationTarget,
    data: SavePushSubscriptionDto,
  ): Promise<PushSubscription> {
    return prisma.pushSubscription.upsert({
      where: { endpoint: data.endpoint },
      create: {
        schoolId,
        userId: target.isStudent ? null : target.id,
        studentId: target.isStudent ? target.id : null,
        endpoint: data.endpoint,
        p256dh: data.keys.p256dh,
        auth: data.keys.auth,
        userAgent: data.userAgent,
      },
      update: {
        schoolId,
        userId: target.isStudent ? null : target.id,
        studentId: target.isStudent ? target.id : null,
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
    target: NotificationTarget | string,
  ): Promise<PushSubscription[]> {
    if (typeof target === 'string') {
      return prisma.pushSubscription.findMany({
        where: {
          schoolId,
          OR: [{ userId: target }, { studentId: target }],
        },
      });
    }
    return prisma.pushSubscription.findMany({
      where: {
        schoolId,
        ...(target.isStudent ? { studentId: target.id } : { userId: target.id }),
      },
    });
  }

  async findPushSubscriptionsByUsers(
    schoolId: string,
    userIds: string[],
    studentIds?: string[],
  ): Promise<PushSubscription[]> {
    const conditions: Prisma.PushSubscriptionWhereInput[] = [];
    if (userIds.length > 0) {
      conditions.push({ userId: { in: userIds } });
    }
    if (studentIds && studentIds.length > 0) {
      conditions.push({ studentId: { in: studentIds } });
    }
    if (conditions.length === 0) return [];

    return prisma.pushSubscription.findMany({
      where: {
        schoolId,
        OR: conditions,
      },
    });
  }
}
