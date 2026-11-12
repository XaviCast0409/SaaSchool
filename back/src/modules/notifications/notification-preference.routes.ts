import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { authMiddleware } from '../../core/middlewares/auth.middleware';
import { tenantMiddleware } from '../../core/middlewares/tenant.middleware';
import { notificationTypeEnum } from './notification.schema';

/**
 * Preferencias de notificación de la persona que inicia sesión (padre, docente, personal o alumno).
 * Montado en /api/notifications/preferences.
 */
export const notificationPreferenceRouter = Router();
notificationPreferenceRouter.use(authMiddleware, tenantMiddleware);

const time = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Hora inválida (HH:mm)')
  .nullable()
  .optional();

const updateSchema = z
  .object({
    mutedPush: z.array(notificationTypeEnum).max(7).default([]),
    mutedEmail: z.array(notificationTypeEnum).max(7).default([]),
    weeklyDigest: z.boolean().default(true),
    quietFrom: time,
    quietTo: time,
  })
  .refine((v) => Boolean(v.quietFrom) === Boolean(v.quietTo), {
    message: 'Indica la hora de inicio y de fin del horario de silencio.',
    path: ['quietTo'],
  });

const DEFAULTS = { mutedPush: [], mutedEmail: [], weeklyDigest: true, quietFrom: null, quietTo: null };

function ownerWhere(req: Request) {
  const u = req.user!;
  return u.studentId ? { studentId: u.studentId } : { userId: u.userId };
}

notificationPreferenceRouter.get('/', async (req: Request, res: Response) => {
  const pref = await prisma.notificationPreference.findFirst({
    where: { schoolId: req.user!.schoolId, ...ownerWhere(req) },
    select: { mutedPush: true, mutedEmail: true, weeklyDigest: true, quietFrom: true, quietTo: true },
  });
  res.status(200).json({ status: 'success', data: pref ?? DEFAULTS });
});

notificationPreferenceRouter.put('/', async (req: Request, res: Response) => {
  const data = updateSchema.parse(req.body);
  const owner = ownerWhere(req);
  const values = {
    mutedPush: data.mutedPush,
    mutedEmail: data.mutedEmail,
    weeklyDigest: data.weeklyDigest,
    quietFrom: data.quietFrom ?? null,
    quietTo: data.quietTo ?? null,
  };
  const existing = await prisma.notificationPreference.findFirst({ where: owner, select: { id: true } });
  const saved = existing
    ? await prisma.notificationPreference.update({ where: { id: existing.id }, data: values })
    : await prisma.notificationPreference.create({ data: { schoolId: req.user!.schoolId, ...owner, ...values } });
  res.status(200).json({
    status: 'success',
    data: {
      mutedPush: saved.mutedPush,
      mutedEmail: saved.mutedEmail,
      weeklyDigest: saved.weeklyDigest,
      quietFrom: saved.quietFrom,
      quietTo: saved.quietTo,
    },
  });
});
