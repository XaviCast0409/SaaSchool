import { Router } from 'express';
import { NotificationRepository } from './notification.repository';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { authMiddleware } from '../../core/middlewares/auth.middleware';
import { tenantMiddleware } from '../../core/middlewares/tenant.middleware';

const notificationRepository = new NotificationRepository();
export const notificationService = new NotificationService(notificationRepository);
const notificationController = new NotificationController(notificationService);

export const notificationRouter = Router();

// Todas las rutas de notificaciones requieren autenticación y contexto de inquilino
notificationRouter.use(authMiddleware, tenantMiddleware);

// Web Push para Celulares (Segundo Plano)
notificationRouter.get('/vapid-public-key', notificationController.getVapidPublicKey);
notificationRouter.post('/push-subscription', notificationController.savePushSubscription);
notificationRouter.post('/test-push', notificationController.testPushNotification);

// Gestión In-App
notificationRouter.get('/', notificationController.getMyNotifications);
notificationRouter.patch('/read-all', notificationController.markAllAsRead);
notificationRouter.patch('/:id/read', notificationController.markAsRead);
notificationRouter.delete('/:id', notificationController.delete);
