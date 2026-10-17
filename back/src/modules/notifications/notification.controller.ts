import { Request, Response } from 'express';
import type { NotificationService } from './notification.service';
import {
  notificationFilterSchema,
  notificationIdParamSchema,
  savePushSubscriptionSchema,
} from './notification.schema';

export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  getVapidPublicKey = async (_req: Request, res: Response): Promise<void> => {
    const publicKey = this.notificationService.getVapidPublicKey();
    res.status(200).json({
      status: 'success',
      data: { publicKey },
    });
  };

  savePushSubscription = async (req: Request, res: Response): Promise<void> => {
    const schoolId = req.user!.schoolId;
    const userId = req.user!.userId;
    const body = savePushSubscriptionSchema.parse(req.body);

    const subscription = await this.notificationService.savePushSubscription(
      schoolId,
      userId,
      body,
    );

    res.status(201).json({
      status: 'success',
      message: 'Suscripción Web Push para celular guardada correctamente',
      data: subscription,
    });
  };

  testPushNotification = async (req: Request, res: Response): Promise<void> => {
    const schoolId = req.user!.schoolId;
    const userId = req.user!.userId;

    const result = await this.notificationService.sendTestPushNotification(
      schoolId,
      userId,
    );

    res.status(200).json({
      status: 'success',
      message: 'Notificación de prueba enviada al dispositivo móvil',
      data: result,
    });
  };

  getMyNotifications = async (req: Request, res: Response): Promise<void> => {
    const schoolId = req.user!.schoolId;
    const userId = req.user!.userId;
    const filters = notificationFilterSchema.parse(req.query);

    const result = await this.notificationService.getMyNotifications(
      schoolId,
      userId,
      filters,
    );

    res.status(200).json({
      status: 'success',
      data: result.list,
      meta: {
        total: result.total,
        unreadCount: result.unreadCount,
        page: filters.page,
        limit: filters.limit,
      },
    });
  };

  markAsRead = async (req: Request, res: Response): Promise<void> => {
    const schoolId = req.user!.schoolId;
    const userId = req.user!.userId;
    const { id } = notificationIdParamSchema.parse(req.params);

    const updated = await this.notificationService.markAsRead(schoolId, userId, id);

    res.status(200).json({
      status: 'success',
      message: 'Notificación marcada como leída',
      data: updated,
    });
  };

  markAllAsRead = async (req: Request, res: Response): Promise<void> => {
    const schoolId = req.user!.schoolId;
    const userId = req.user!.userId;

    const result = await this.notificationService.markAllAsRead(schoolId, userId);

    res.status(200).json({
      status: 'success',
      message: 'Todas las notificaciones han sido marcadas como leídas',
      data: result,
    });
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    const schoolId = req.user!.schoolId;
    const userId = req.user!.userId;
    const { id } = notificationIdParamSchema.parse(req.params);

    const deleted = await this.notificationService.deleteNotification(
      schoolId,
      userId,
      id,
    );

    res.status(200).json({
      status: 'success',
      message: 'Notificación eliminada',
      data: deleted,
    });
  };
}
