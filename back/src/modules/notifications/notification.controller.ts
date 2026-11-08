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

  private getTarget(req: Request) {
    const isStudent = req.user!.role === 'STUDENT';
    const id = isStudent ? (req.user!.studentId || req.user!.userId) : req.user!.userId;
    return { id, isStudent };
  }

  savePushSubscription = async (req: Request, res: Response): Promise<void> => {
    const schoolId = req.user!.schoolId;
    const target = this.getTarget(req);
    const body = savePushSubscriptionSchema.parse(req.body);

    const subscription = await this.notificationService.savePushSubscription(
      schoolId,
      target,
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
    const target = this.getTarget(req);

    const result = await this.notificationService.sendTestPushNotification(
      schoolId,
      target,
    );

    res.status(200).json({
      status: 'success',
      message: 'Notificación de prueba enviada al dispositivo móvil',
      data: result,
    });
  };

  getMyNotifications = async (req: Request, res: Response): Promise<void> => {
    const schoolId = req.user!.schoolId;
    const target = this.getTarget(req);
    const filters = notificationFilterSchema.parse(req.query);

    const result = await this.notificationService.getMyNotifications(
      schoolId,
      target,
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
    const target = this.getTarget(req);
    const { id } = notificationIdParamSchema.parse(req.params);

    const updated = await this.notificationService.markAsRead(schoolId, target, id);

    res.status(200).json({
      status: 'success',
      message: 'Notificación marcada como leída',
      data: updated,
    });
  };

  markAllAsRead = async (req: Request, res: Response): Promise<void> => {
    const schoolId = req.user!.schoolId;
    const target = this.getTarget(req);

    const result = await this.notificationService.markAllAsRead(schoolId, target);

    res.status(200).json({
      status: 'success',
      message: 'Todas las notificaciones han sido marcadas como leídas',
      data: result,
    });
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    const schoolId = req.user!.schoolId;
    const target = this.getTarget(req);
    const { id } = notificationIdParamSchema.parse(req.params);

    const deleted = await this.notificationService.deleteNotification(
      schoolId,
      target,
      id,
    );

    res.status(200).json({
      status: 'success',
      message: 'Notificación eliminada',
      data: deleted,
    });
  };
}
