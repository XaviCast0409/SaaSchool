import { z } from 'zod';

export const notificationTypeEnum = z.enum([
  'PAYMENT',
  'ATTENDANCE',
  'ANNOUNCEMENT',
  'ACADEMIC',
  'GENERAL',
]);

export const createNotificationSchema = z.object({
  userId: z.string().uuid('ID de usuario inválido'),
  title: z.string().min(1, 'El título es requerido').max(150),
  message: z.string().min(1, 'El mensaje es requerido'),
  type: notificationTypeEnum.default('GENERAL'),
  link: z.string().optional(),
});

export const notificationFilterSchema = z.object({
  isRead: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) => (val !== undefined ? val === 'true' : undefined)),
  limit: z.coerce.number().int().positive().max(100).default(20),
  page: z.coerce.number().int().positive().default(1),
});

export const notificationIdParamSchema = z.object({
  id: z.string().uuid('ID de notificación inválido'),
});

export const savePushSubscriptionSchema = z.object({
  endpoint: z.string().url('Endpoint de suscripción inválido'),
  keys: z.object({
    p256dh: z.string().min(1, 'Clave p256dh requerida'),
    auth: z.string().min(1, 'Clave auth requerida'),
  }),
  userAgent: z.string().optional(),
});

export type CreateNotificationDto = z.infer<typeof createNotificationSchema>;
export type NotificationFilterDto = z.infer<typeof notificationFilterSchema>;
export type NotificationIdParam = z.infer<typeof notificationIdParamSchema>;
export type SavePushSubscriptionDto = z.infer<typeof savePushSubscriptionSchema>;
