import type { Notification, PushSubscription } from '@prisma/client';
import type { NotificationRepository, NotificationTarget } from './notification.repository';
import type {
  CreateNotificationDto,
  NotificationFilterDto,
  SavePushSubscriptionDto,
} from './notification.schema';
import { sendWebPushNotification } from '../../utils/web-push.util';
import { env } from '../../config/env';

export class NotificationService {
  constructor(private readonly notificationRepository: NotificationRepository) {}

  private resolveTarget(target: NotificationTarget | string): NotificationTarget {
    if (typeof target === 'string') {
      return { id: target, isStudent: false };
    }
    return target;
  }

  getVapidPublicKey(): string {
    return env.VAPID_PUBLIC_KEY;
  }

  async getMyNotifications(
    schoolId: string,
    target: NotificationTarget | string,
    filters: NotificationFilterDto,
  ): Promise<{ list: Notification[]; total: number; unreadCount: number }> {
    return this.notificationRepository.findByUser(schoolId, this.resolveTarget(target), filters);
  }

  async markAsRead(
    schoolId: string,
    target: NotificationTarget | string,
    notificationId: string,
  ): Promise<Notification> {
    return this.notificationRepository.markAsRead(schoolId, this.resolveTarget(target), notificationId);
  }

  async markAllAsRead(schoolId: string, target: NotificationTarget | string): Promise<{ count: number }> {
    return this.notificationRepository.markAllAsRead(schoolId, this.resolveTarget(target));
  }

  async deleteNotification(
    schoolId: string,
    target: NotificationTarget | string,
    notificationId: string,
  ): Promise<Notification> {
    return this.notificationRepository.delete(schoolId, this.resolveTarget(target), notificationId);
  }

  async savePushSubscription(
    schoolId: string,
    target: NotificationTarget | string,
    data: SavePushSubscriptionDto,
  ): Promise<PushSubscription> {
    return this.notificationRepository.upsertPushSubscription(schoolId, this.resolveTarget(target), data);
  }

  async sendTestPushNotification(
    schoolId: string,
    target: NotificationTarget | string,
  ): Promise<{ sent: number; failed: number }> {
    const subscriptions = await this.notificationRepository.findPushSubscriptionsByUser(
      schoolId,
      this.resolveTarget(target),
    );

    let sent = 0;
    let failed = 0;

    for (const sub of subscriptions) {
      const result = await sendWebPushNotification(
        { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
        {
          title: '📲 ¡Notificaciones en segundo plano activas!',
          message:
            'Tu celular ahora recibirá avisos de cobranzas, comunicados y notas al instante.',
          type: 'GENERAL',
          link: '/dashboard',
        },
      );

      if (result.success) {
        sent++;
      } else {
        failed++;
        if (result.shouldRemove) {
          await this.notificationRepository.deletePushSubscription(sub.endpoint);
        }
      }
    }

    return { sent, failed };
  }

  async createNotification(
    schoolId: string,
    data: CreateNotificationDto,
  ): Promise<Notification> {
    const notification = await this.notificationRepository.create(schoolId, data);

    // Enviar Web Push en segundo plano a los celulares/navegadores registrados del usuario o alumno
    const targetId = (data.studentId || data.userId)!;
    if (targetId) {
      this.dispatchPushToUser(schoolId, targetId, {
        title: data.title,
        message: data.message,
        type: data.type,
        link: data.link,
      }).catch((err) => console.error('Error dispatching push to user/student:', err));
    }

    return notification;
  }

  async createBulkNotifications(
    schoolId: string,
    notifications: CreateNotificationDto[],
  ): Promise<{ count: number }> {
    const result = await this.notificationRepository.createMany(schoolId, notifications);

    // Enviar Web Push en segundo plano a los usuarios afectados
    if (notifications.length > 0) {
      const userIds = Array.from(
        new Set(
          notifications
            .map((n) => n.userId)
            .filter((uid): uid is string => Boolean(uid)),
        ),
      );
      this.dispatchPushToMultipleUsers(schoolId, userIds, {
        title: notifications[0].title,
        message: notifications[0].message,
        type: notifications[0].type,
        link: notifications[0].link,
      }).catch((err) => console.error('Error dispatching bulk push:', err));
    }

    return result;
  }

  private async dispatchPushToUser(
    schoolId: string,
    userId: string,
    payload: { title: string; message: string; type?: string; link?: string },
  ): Promise<void> {
    const subscriptions = await this.notificationRepository.findPushSubscriptionsByUser(
      schoolId,
      userId,
    );

    for (const sub of subscriptions) {
      const res = await sendWebPushNotification(
        { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
        payload,
      );
      if (res.shouldRemove) {
        await this.notificationRepository.deletePushSubscription(sub.endpoint);
      }
    }
  }

  private async dispatchPushToMultipleUsers(
    schoolId: string,
    userIds: string[],
    payload: { title: string; message: string; type?: string; link?: string },
  ): Promise<void> {
    const subscriptions = await this.notificationRepository.findPushSubscriptionsByUsers(
      schoolId,
      userIds,
    );

    for (const sub of subscriptions) {
      const res = await sendWebPushNotification(
        { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
        payload,
      );
      if (res.shouldRemove) {
        await this.notificationRepository.deletePushSubscription(sub.endpoint);
      }
    }
  }
}
