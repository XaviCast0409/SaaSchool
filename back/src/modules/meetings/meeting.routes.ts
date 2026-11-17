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
import { generateSlots, hasMinimumNotice, limaDateTime, weeklyDates, withoutOverlaps } from './meeting.rules';

/**
 * Agenda de entrevistas: el docente/tutor publica horarios libres y el apoderado reserva uno.
 * Reemplaza las citas coordinadas por cuaderno de control o WhatsApp.
 */
export const meetingRouter = Router();
meetingRouter.use(authMiddleware, tenantMiddleware);

// Las familias reservan solo con los docentes que enseñan a su hijo: tutor(a) y docentes de sus cursos.
// Dirección no recibe reservas (salvo que también dicte en el aula); Secretaría tampoco.
const STAFF = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER'] as const;
/** Una solicitud de horario por familia, alumno y docente cada 24 horas, con un tope diario por familia. */
const REQUEST_COOLDOWN_HOURS = 24;
const MAX_REQUESTS_PER_DAY = 10;
/** Una solicitud sin atender se muestra a la familia como vigente esta cantidad de días; luego puede volver a pedir. */
const REQUEST_VISIBLE_DAYS = 7;
const MIN_NOTICE_HOURS = 2;
const MAX_SLOTS_PER_PUBLISH = 120;
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

/** Fecha y hora terminadas en punto, sin duplicarlo («… 3:00 p. m.» ya trae el suyo). */
const whenSentence = (d: Date) => {
  const when = formatLimaDateTime(d);
  return when.endsWith('.') ? when : `${when}.`;
};

/** Docentes que enseñan al alumno este año: tutor(a) y docentes de sus cursos (sin Dirección). */
async function teachersOfStudent(schoolId: string, studentId: string) {
  return (await staffContactsForStudent(schoolId, studentId)).filter((c) => c.roleLabel !== 'Dirección');
}

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
    /** Repetir el mismo horario las semanas siguientes (1 = solo ese día) */
    repeatWeeks: z.number().int().min(1).max(8).default(1),
  })
  .refine((v) => v.from < v.to, { message: 'La hora de fin debe ser mayor a la de inicio.', path: ['to'] });

/** Publica varios horarios de una vez (p. ej. martes de 2:00 a 4:00 p. m., cada 20 minutos, durante 4 semanas). */
meetingRouter.post('/slots/bulk', authorizeRoles(...STAFF), async (req: Request, res: Response) => {
  const dto = bulkSchema.parse(req.body);
  const schoolId = req.user!.schoolId;
  const staffId = req.user!.userId;
  if (!hasMinimumNotice(limaDateTime(dto.date, dto.from), 0)) throw new AppError('No puedes publicar horarios en el pasado.', 400);

  const perDay = generateSlots(dto.date, dto.from, dto.to, dto.durationMinutes);
  if (perDay.length === 0) throw new AppError('El rango es más corto que la duración de una cita.', 400);
  if (perDay.length > 40) throw new AppError('Demasiados horarios en un solo día (máximo 40).', 400);
  const candidates = weeklyDates(dto.date, dto.repeatWeeks).flatMap((day) => generateSlots(day, dto.from, dto.to, dto.durationMinutes));
  if (candidates.length > MAX_SLOTS_PER_PUBLISH) {
    throw new AppError(`Demasiados horarios de una vez (máximo ${MAX_SLOTS_PER_PUBLISH}). Reduce las semanas o alarga la duración.`, 400);
  }

  const existing = await prisma.meetingSlot.findMany({
    where: { schoolId, staffId, status: { not: 'CANCELLED' }, startsAt: { lt: candidates[candidates.length - 1].endsAt }, endsAt: { gt: candidates[0].startsAt } },
    select: { startsAt: true, endsAt: true },
  });
  const fresh = withoutOverlaps(candidates, existing);
  let notified = 0;
  if (fresh.length > 0) {
    await prisma.meetingSlot.createMany({
      data: fresh.map((s) => ({ schoolId, staffId, startsAt: s.startsAt, endsAt: s.endsAt, mode: dto.mode, location: dto.location || null })),
    });
    // Familias que le pidieron horario: se les avisa que ya pueden reservar
    const requests = await prisma.meetingRequest.findMany({
      where: { schoolId, staffId, status: 'PENDING' },
      select: { id: true, parentId: true, staff: { select: { firstName: true, lastNamePaternal: true } } },
    });
    if (requests.length > 0) {
      await prisma.meetingRequest.updateMany({ where: { id: { in: requests.map((r) => r.id) } }, data: { status: 'RESOLVED', resolvedAt: new Date() } });
      const parents = [...new Set(requests.map((r) => r.parentId))];
      notified = parents.length;
      await deliver(
        schoolId,
        parents.map((userId) => ({ userId })),
        {
          title: 'Ya puedes reservar tu entrevista',
          message: `${fullName(requests[0].staff)} publicó horarios de entrevista, como pediste. Elige el que te acomode.`,
          type: 'GENERAL',
          link: '/meetings',
        },
        { schoolName: await schoolName(schoolId) },
      );
    }
  }
  res.status(201).json({ status: 'success', data: { created: fresh.length, skipped: candidates.length - fresh.length, notified } });
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

/** El personal anula un horario. Si estaba reservado, avisa a la familia (con el motivo, si lo da). */
meetingRouter.delete('/slots/:id', authorizeRoles(...STAFF), async (req: Request, res: Response) => {
  const { id } = z.object({ id: uuid }).parse(req.params);
  const { reason } = z.object({ reason: z.string().trim().max(300).optional() }).parse(req.body ?? {});
  const slot = await prisma.meetingSlot.findFirst({ where: { id, schoolId: req.user!.schoolId, staffId: req.user!.userId }, select: SLOT_SELECT });
  if (!slot) throw new AppError('Horario no encontrado.', 404);
  await prisma.meetingSlot.update({ where: { id }, data: { status: 'CANCELLED' } });
  if (slot.status === 'BOOKED' && slot.parent) {
    await deliver(
      req.user!.schoolId,
      [{ userId: slot.parent.id }],
      {
        title: 'Entrevista cancelada',
        message: `${fullName(slot.staff)} canceló la entrevista del ${whenSentence(slot.startsAt)}${reason ? ` Motivo: ${reason}.` : ''} Puede reservar otro horario.`,
        type: 'GENERAL',
        link: '/meetings',
      },
      { schoolName: await schoolName(req.user!.schoolId) },
    );
  }
  res.status(200).json({ status: 'success', data: { cancelled: true } });
});

/** Familias que me pidieron horario de entrevista y aún esperan (últimos 30 días). */
meetingRouter.get('/requests', authorizeRoles(...STAFF), async (req: Request, res: Response) => {
  const rows = await prisma.meetingRequest.findMany({
    where: { schoolId: req.user!.schoolId, staffId: req.user!.userId, status: 'PENDING', createdAt: { gte: new Date(Date.now() - 30 * 86_400_000) } },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true,
      message: true,
      createdAt: true,
      parent: { select: { id: true, firstName: true, lastNamePaternal: true, cellphone: true } },
      student: { select: { id: true, firstNames: true, lastNamePaternal: true } },
    },
  });
  res.status(200).json({
    status: 'success',
    data: rows.map((r) => ({ ...r, student: { id: r.student.id, name: studentShortName(r.student) } })),
  });
});

/** El docente da por atendida una solicitud (p. ej. ya conversó con la familia por otro medio). */
meetingRouter.post('/requests/:id/dismiss', authorizeRoles(...STAFF), async (req: Request, res: Response) => {
  const { id } = z.object({ id: uuid }).parse(req.params);
  const updated = await prisma.meetingRequest.updateMany({
    where: { id, schoolId: req.user!.schoolId, staffId: req.user!.userId, status: 'PENDING' },
    data: { status: 'RESOLVED', resolvedAt: new Date() },
  });
  if (updated.count === 0) throw new AppError('Solicitud no encontrada.', 404);
  res.status(200).json({ status: 'success', data: { dismissed: true } });
});

// ---------------------------------------------------------------- Familias

/** Horarios libres del tutor y docentes de un hijo. */
meetingRouter.get('/available', authorizeRoles('PARENT'), async (req: Request, res: Response) => {
  const { studentId } = z.object({ studentId: uuid }).parse(req.query);
  const schoolId = req.user!.schoolId;
  const parentId = req.user!.userId;
  const rel = await prisma.familyRelationship.findFirst({ where: { userId: parentId, studentId }, select: { id: true } });
  if (!rel) throw new AppError('Solo puedes reservar para tus hijos.', 403);

  const contacts = await teachersOfStudent(schoolId, studentId);
  // Solicitudes de horario de esta familia para este hijo que el docente aún no atiende
  const requests = await prisma.meetingRequest.findMany({
    where: {
      schoolId,
      parentId,
      studentId,
      status: 'PENDING',
      staffId: { in: contacts.map((c) => c.id) },
      createdAt: { gte: new Date(Date.now() - REQUEST_VISIBLE_DAYS * 86_400_000) },
    },
    orderBy: { createdAt: 'desc' },
    select: { staffId: true, createdAt: true },
  });
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
  // Todos los docentes del hijo, también los que aún no publican horarios (se les puede pedir uno)
  res.status(200).json({
    status: 'success',
    data: contacts.map((c) => ({
      ...c,
      slots: slots.filter((s) => s.staffId === c.id),
      requestedAt: requests.find((r) => r.staffId === c.id)?.createdAt ?? null,
    })),
  });
});

const requestSchema = z.object({ studentId: uuid, staffId: uuid, message: z.string().trim().max(500).optional() });

/** La familia le pide a un docente de su hijo que publique horarios de entrevista. */
meetingRouter.post('/requests', authorizeRoles('PARENT'), async (req: Request, res: Response) => {
  const dto = requestSchema.parse(req.body);
  const schoolId = req.user!.schoolId;
  const parentId = req.user!.userId;
  const rel = await prisma.familyRelationship.findFirst({ where: { userId: parentId, studentId: dto.studentId }, select: { id: true } });
  if (!rel) throw new AppError('Solo puedes pedir entrevistas para tus hijos.', 403);
  const teachers = await teachersOfStudent(schoolId, dto.studentId);
  if (!teachers.some((t) => t.id === dto.staffId)) throw new AppError('Solo puedes pedir entrevista a los docentes de tu hijo(a).', 403);

  const free = await prisma.meetingSlot.count({
    where: { schoolId, staffId: dto.staffId, status: 'AVAILABLE', startsAt: { gte: new Date(Date.now() + MIN_NOTICE_HOURS * 3_600_000) } },
  });
  if (free > 0) throw new AppError('Este docente ya tiene horarios libres: reserva uno directamente.', 409);
  const since = new Date(Date.now() - REQUEST_COOLDOWN_HOURS * 3_600_000);
  const [recent, today] = await Promise.all([
    prisma.meetingRequest.findFirst({ where: { schoolId, parentId, studentId: dto.studentId, staffId: dto.staffId, createdAt: { gte: since } }, select: { id: true } }),
    prisma.meetingRequest.count({ where: { schoolId, parentId, createdAt: { gte: since } } }),
  ]);
  if (recent) throw new AppError('Ya se lo pediste hoy. Te avisaremos cuando publique horarios.', 409);
  if (today >= MAX_REQUESTS_PER_DAY) throw new AppError('Llegaste al límite de solicitudes por hoy. Inténtalo mañana.', 429);

  // Una solicitud anterior sin atender queda reemplazada por esta (el docente no ve duplicados)
  await prisma.meetingRequest.updateMany({
    where: { schoolId, parentId, studentId: dto.studentId, staffId: dto.staffId, status: 'PENDING' },
    data: { status: 'RESOLVED', resolvedAt: new Date() },
  });
  const created = await prisma.meetingRequest.create({
    data: { schoolId, parentId, studentId: dto.studentId, staffId: dto.staffId, message: dto.message || null },
    select: {
      id: true,
      createdAt: true,
      parent: { select: { firstName: true, lastNamePaternal: true } },
      student: { select: { firstNames: true, lastNamePaternal: true } },
    },
  });
  await deliver(
    schoolId,
    [{ userId: dto.staffId }],
    {
      title: 'Una familia pide una entrevista',
      message: `${fullName(created.parent)} (${studentShortName(created.student)}) quiere una entrevista contigo${dto.message ? `: «${dto.message}»` : ''}. Publica tus horarios en Entrevistas y le avisaremos.`,
      type: 'GENERAL',
      link: '/meetings',
    },
    { schoolName: await schoolName(schoolId) },
  );
  res.status(201).json({ status: 'success', data: { id: created.id, requestedAt: created.createdAt } });
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
  const teachers = await teachersOfStudent(schoolId, dto.studentId);
  if (!teachers.some((c) => c.id === slot.staffId)) throw new AppError('Solo puedes reservar con los docentes de tu hijo(a).', 403);
  if (!hasMinimumNotice(slot.startsAt, MIN_NOTICE_HOURS)) throw new AppError(`Reserva con al menos ${MIN_NOTICE_HOURS} horas de anticipación.`, 400);
  // Una sola entrevista pendiente por familia, alumno y docente: deja horarios libres para las demás familias
  const pending = await prisma.meetingSlot.findFirst({
    where: { schoolId, staffId: slot.staffId, bookedByParentId: parentId, studentId: dto.studentId, status: 'BOOKED', startsAt: { gt: new Date() } },
    select: { startsAt: true },
  });
  if (pending) {
    throw new AppError(`Ya tienes una entrevista reservada con este docente el ${formatLimaDateTime(pending.startsAt)}. Cancélala si necesitas otro horario.`, 409);
  }

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
  // Misma anticipación que para reservar: el docente ya organizó su tiempo para esa cita
  if (!hasMinimumNotice(slot.startsAt, MIN_NOTICE_HOURS)) {
    throw new AppError(
      `Solo puedes cancelar con al menos ${MIN_NOTICE_HOURS} horas de anticipación. Si surgió un imprevisto, escríbele al docente por Mensajes.`,
      400,
    );
  }
  await prisma.meetingSlot.update({
    where: { id },
    data: { status: 'AVAILABLE', bookedByParentId: null, studentId: null, reason: null, bookedAt: null },
  });
  await deliver(
    schoolId,
    [{ userId: slot.staff.id }],
    {
      title: 'Entrevista cancelada por la familia',
      message: `${slot.parent ? fullName(slot.parent) : 'La familia'} canceló la entrevista del ${whenSentence(slot.startsAt)} El horario volvió a quedar libre.`,
      type: 'GENERAL',
      link: '/meetings',
    },
    { schoolName: await schoolName(schoolId) },
  );
  res.status(200).json({ status: 'success', data: { cancelled: true } });
});
