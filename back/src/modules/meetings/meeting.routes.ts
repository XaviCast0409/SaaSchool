import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { AppError } from '../../core/errors/app-error';
import { authMiddleware, authorizeRoles } from '../../core/middlewares/auth.middleware';
import { tenantMiddleware } from '../../core/middlewares/tenant.middleware';
import { formatLimaDateTime } from '../../utils/timezone.util';
import { deliver } from '../automations/delivery';
import { studentShortName } from '../automations/recipients';
import { staffContactsForStudent } from '../messaging/messaging.service';
import { generateSlots, hasMinimumNotice, limaDateTime, withoutOverlaps } from './meeting.rules';

/**
 * Agenda de entrevistas: el docente/tutor publica horarios libres y el apoderado reserva uno.
 * Reemplaza las citas coordinadas por cuaderno de control o WhatsApp.
 */
export const meetingRouter = Router();
meetingRouter.use(authMiddleware, tenantMiddleware);

const STAFF = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER'] as const;
const MIN_NOTICE_HOURS = 2;
const uuid = z.string().uuid();
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

const MODE_LABEL: Record<string, string> = { IN_PERSON: 'Presencial', VIRTUAL: 'Videollamada', PHONE: 'Llamada' };
const fullName = (u: { firstName: string; lastNamePaternal: string }) => `${u.firstName} ${u.lastNamePaternal}`;

const SLOT_SELECT = {
  id: true,
  startsAt: true,
  endsAt: true,
  mode: true,
  location: true,
  status: true,
  reason: true,
  bookedAt: true,
  staff: { select: { id: true, firstName: true, lastNamePaternal: true } },
  parent: { select: { id: true, firstName: true, lastNamePaternal: true, cellphone: true } },
  student: { select: { id: true, firstNames: true, lastNamePaternal: true } },
} as const;

async function schoolName(schoolId: string) {
  return (await prisma.school.findUnique({ where: { id: schoolId }, select: { name: true } }))?.name ?? '';
}

// ---------------------------------------------------------------- Personal

const bulkSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    from: time,
    to: time,
    durationMinutes: z.number().int().min(10).max(90),
    mode: z.enum(['IN_PERSON', 'VIRTUAL', 'PHONE']).default('IN_PERSON'),
    location: z.string().trim().max(200).optional(),
  })
  .refine((v) => v.from < v.to, { message: 'La hora de fin debe ser mayor a la de inicio.', path: ['to'] });

/** Publica varios horarios de una vez (p. ej. martes de 2:00 a 4:00 p. m., cada 20 minutos). */
meetingRouter.post('/slots/bulk', authorizeRoles(...STAFF), async (req: Request, res: Response) => {
  const dto = bulkSchema.parse(req.body);
  const schoolId = req.user!.schoolId;
  const staffId = req.user!.userId;
  if (!hasMinimumNotice(limaDateTime(dto.date, dto.from), 0)) throw new AppError('No puedes publicar horarios en el pasado.', 400);

  const candidates = generateSlots(dto.date, dto.from, dto.to, dto.durationMinutes);
  if (candidates.length === 0) throw new AppError('El rango es más corto que la duración de una cita.', 400);
  if (candidates.length > 40) throw new AppError('Demasiados horarios en un solo día (máximo 40).', 400);

  const existing = await prisma.meetingSlot.findMany({
    where: { schoolId, staffId, status: { not: 'CANCELLED' }, startsAt: { lt: candidates[candidates.length - 1].endsAt }, endsAt: { gt: candidates[0].startsAt } },
    select: { startsAt: true, endsAt: true },
  });
  const fresh = withoutOverlaps(candidates, existing);
  if (fresh.length > 0) {
    await prisma.meetingSlot.createMany({
      data: fresh.map((s) => ({ schoolId, staffId, startsAt: s.startsAt, endsAt: s.endsAt, mode: dto.mode, location: dto.location || null })),
    });
  }
  res.status(201).json({ status: 'success', data: { created: fresh.length, skipped: candidates.length - fresh.length } });
});

/** Mis horarios (próximos y de los últimos 7 días). */
meetingRouter.get('/mine', authorizeRoles(...STAFF), async (req: Request, res: Response) => {
  const since = new Date(Date.now() - 7 * 86_400_000);
  const slots = await prisma.meetingSlot.findMany({
    where: { schoolId: req.user!.schoolId, staffId: req.user!.userId, startsAt: { gte: since }, status: { not: 'CANCELLED' } },
    orderBy: { startsAt: 'asc' },
    take: 200,
    select: SLOT_SELECT,
  });
  res.status(200).json({
    status: 'success',
    data: slots.map((s) => ({ ...s, student: s.student ? { id: s.student.id, name: studentShortName(s.student) } : null })),
  });
});

/** El personal anula un horario. Si estaba reservado, avisa a la familia. */
meetingRouter.delete('/slots/:id', authorizeRoles(...STAFF), async (req: Request, res: Response) => {
  const { id } = z.object({ id: uuid }).parse(req.params);
  const slot = await prisma.meetingSlot.findFirst({ where: { id, schoolId: req.user!.schoolId, staffId: req.user!.userId }, select: SLOT_SELECT });
  if (!slot) throw new AppError('Horario no encontrado.', 404);
  await prisma.meetingSlot.update({ where: { id }, data: { status: 'CANCELLED' } });
  if (slot.status === 'BOOKED' && slot.parent) {
    await deliver(
      req.user!.schoolId,
      [{ userId: slot.parent.id }],
      {
        title: 'Entrevista cancelada',
        message: `${fullName(slot.staff)} canceló la entrevista del ${formatLimaDateTime(slot.startsAt)}. Puede reservar otro horario.`,
        type: 'GENERAL',
        link: '/meetings',
      },
      { schoolName: await schoolName(req.user!.schoolId) },
    );
  }
  res.status(200).json({ status: 'success', data: { cancelled: true } });
});

// ---------------------------------------------------------------- Familias

/** Horarios libres del tutor y docentes de un hijo. */
meetingRouter.get('/available', authorizeRoles('PARENT'), async (req: Request, res: Response) => {
  const { studentId } = z.object({ studentId: uuid }).parse(req.query);
  const schoolId = req.user!.schoolId;
  const rel = await prisma.familyRelationship.findFirst({ where: { userId: req.user!.userId, studentId }, select: { id: true } });
  if (!rel) throw new AppError('Solo puedes reservar para tus hijos.', 403);

  const contacts = await staffContactsForStudent(schoolId, studentId);
  const slots = await prisma.meetingSlot.findMany({
    where: {
      schoolId,
      status: 'AVAILABLE',
      staffId: { in: contacts.map((c) => c.id) },
      startsAt: { gte: new Date(Date.now() + MIN_NOTICE_HOURS * 3_600_000) },
    },
    orderBy: { startsAt: 'asc' },
    take: 300,
    select: { id: true, staffId: true, startsAt: true, endsAt: true, mode: true, location: true },
  });
  res.status(200).json({
    status: 'success',
    data: contacts
      .map((c) => ({ ...c, slots: slots.filter((s) => s.staffId === c.id) }))
      .filter((c) => c.slots.length > 0),
  });
});

/** Mis entrevistas reservadas. */
meetingRouter.get('/my-bookings', authorizeRoles('PARENT'), async (req: Request, res: Response) => {
  const slots = await prisma.meetingSlot.findMany({
    where: { schoolId: req.user!.schoolId, bookedByParentId: req.user!.userId, status: 'BOOKED', endsAt: { gte: new Date(Date.now() - 86_400_000) } },
    orderBy: { startsAt: 'asc' },
    select: SLOT_SELECT,
  });
  res.status(200).json({
    status: 'success',
    data: slots.map((s) => ({ ...s, staffName: fullName(s.staff), student: s.student ? { id: s.student.id, name: studentShortName(s.student) } : null })),
  });
});

const bookSchema = z.object({ studentId: uuid, reason: z.string().trim().min(3, 'Cuéntale brevemente el motivo.').max(500) });

/** Reservar un horario. La actualización condicionada evita que dos familias tomen el mismo. */
meetingRouter.post('/slots/:id/book', authorizeRoles('PARENT'), async (req: Request, res: Response) => {
  const { id } = z.object({ id: uuid }).parse(req.params);
  const dto = bookSchema.parse(req.body);
  const schoolId = req.user!.schoolId;
  const parentId = req.user!.userId;

  const rel = await prisma.familyRelationship.findFirst({ where: { userId: parentId, studentId: dto.studentId }, select: { id: true } });
  if (!rel) throw new AppError('Solo puedes reservar para tus hijos.', 403);
  const slot = await prisma.meetingSlot.findFirst({ where: { id, schoolId }, select: { staffId: true, startsAt: true } });
  if (!slot) throw new AppError('Horario no encontrado.', 404);
  const contacts = await staffContactsForStudent(schoolId, dto.studentId);
  if (!contacts.some((c) => c.id === slot.staffId)) throw new AppError('Este docente no enseña a tu hijo(a).', 403);
  if (!hasMinimumNotice(slot.startsAt, MIN_NOTICE_HOURS)) throw new AppError(`Reserva con al menos ${MIN_NOTICE_HOURS} horas de anticipación.`, 400);

  const updated = await prisma.meetingSlot.updateMany({
    where: { id, schoolId, status: 'AVAILABLE' },
    data: { status: 'BOOKED', bookedByParentId: parentId, studentId: dto.studentId, reason: dto.reason, bookedAt: new Date() },
  });
  if (updated.count === 0) throw new AppError('Ese horario acaba de ser reservado por otra familia. Elige otro.', 409);

  const booked = await prisma.meetingSlot.findUniqueOrThrow({ where: { id }, select: SLOT_SELECT });
  await deliver(
    schoolId,
    [{ userId: booked.staff.id }],
    {
      title: 'Nueva entrevista reservada',
      message: `${booked.parent ? fullName(booked.parent) : 'Una familia'} (${booked.student ? studentShortName(booked.student) : ''}) · ${formatLimaDateTime(booked.startsAt)} · ${MODE_LABEL[booked.mode]}. Motivo: ${dto.reason}`,
      type: 'GENERAL',
      link: '/meetings',
    },
    { schoolName: await schoolName(schoolId) },
  );
  res.status(200).json({ status: 'success', data: booked });
});

/** La familia cancela su reserva (el horario vuelve a quedar libre). */
meetingRouter.post('/slots/:id/cancel-booking', authorizeRoles('PARENT'), async (req: Request, res: Response) => {
  const { id } = z.object({ id: uuid }).parse(req.params);
  const schoolId = req.user!.schoolId;
  const slot = await prisma.meetingSlot.findFirst({ where: { id, schoolId, bookedByParentId: req.user!.userId, status: 'BOOKED' }, select: SLOT_SELECT });
  if (!slot) throw new AppError('Reserva no encontrada.', 404);
  await prisma.meetingSlot.update({
    where: { id },
    data: { status: 'AVAILABLE', bookedByParentId: null, studentId: null, reason: null, bookedAt: null },
  });
  await deliver(
    schoolId,
    [{ userId: slot.staff.id }],
    {
      title: 'Entrevista cancelada por la familia',
      message: `${slot.parent ? fullName(slot.parent) : 'La familia'} canceló la entrevista del ${formatLimaDateTime(slot.startsAt)}. El horario volvió a quedar libre.`,
      type: 'GENERAL',
      link: '/meetings',
    },
    { schoolName: await schoolName(schoolId) },
  );
  res.status(200).json({ status: 'success', data: { cancelled: true } });
});
