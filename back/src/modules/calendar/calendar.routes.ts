import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { AppError } from '../../core/errors/app-error';
import { authMiddleware, authorizeRoles } from '../../core/middlewares/auth.middleware';
import { tenantMiddleware } from '../../core/middlewares/tenant.middleware';
import { recordAudit } from '../../utils/audit.util';
import { parseSchoolDate } from '../../utils/timezone.util';
import { deliver } from '../automations/delivery';
import { activeYear, type Viewer } from '../schedule/schedule.access';
import { collectCalendar, feedToken } from './calendar.service';
import { civicDates, nationalHolidays, withinRange } from './official-dates';

/** Calendario escolar: eventos del colegio y vista combinada por persona. */
export const calendarRouter = Router();
calendarRouter.use(authMiddleware, tenantMiddleware);

const viewerOf = (req: Request): Viewer => ({
  userId: req.user!.userId,
  role: req.user!.role,
  schoolId: req.user!.schoolId,
  studentId: req.user!.studentId,
});
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

calendarRouter.get('/', async (req: Request, res: Response) => {
  const q = z.object({ from: dateStr, to: dateStr }).parse(req.query);
  const days = (parseSchoolDate(q.to).getTime() - parseSchoolDate(q.from).getTime()) / 86_400_000;
  if (days < 0 || days > 92) throw new AppError('El rango debe ser de hasta 3 meses.', 400);
  res.status(200).json({ status: 'success', data: await collectCalendar(viewerOf(req), q.from, q.to) });
});

/** Enlace de suscripción personal (Google Calendar, iPhone, Outlook). */
calendarRouter.get('/feed-url', async (req: Request, res: Response) => {
  const token = await feedToken(viewerOf(req));
  const httpsUrl = `${env.PUBLIC_API_URL.replace(/\/$/, '')}/api/calendar-feed/${token}.ics`;
  res.status(200).json({ status: 'success', data: { httpsUrl, webcalUrl: httpsUrl.replace(/^https?:\/\//, 'webcal://') } });
});

const eventSchema = z
  .object({
    title: z.string().trim().min(3).max(150),
    description: z.string().trim().max(2000).nullable().optional(),
    type: z.enum(['EXAM', 'ACTIVITY', 'MEETING', 'CIVIC', 'DEADLINE', 'OTHER']).default('OTHER'),
    startDate: dateStr,
    endDate: dateStr.nullable().optional(),
    startTime: time.nullable().optional(),
    endTime: time.nullable().optional(),
    location: z.string().trim().max(200).nullable().optional(),
    classroomId: z.string().uuid().nullable().optional(),
    educationLevel: z.enum(['INITIAL', 'PRIMARY', 'SECONDARY']).nullable().optional(),
    visibleToFamilies: z.boolean().default(true),
    notifyFamilies: z.boolean().default(false),
  })
  .refine((v) => !v.endDate || v.endDate >= v.startDate, { message: 'La fecha de fin no puede ser anterior al inicio.', path: ['endDate'] })
  .refine((v) => !v.endTime || !v.startTime || v.endTime > v.startTime, { message: 'La hora de fin debe ser posterior al inicio.', path: ['endTime'] });

/** Un docente solo puede crear eventos para las aulas donde enseña o es tutor. */
async function assertCanTarget(viewer: Viewer, classroomId: string | null | undefined) {
  if (viewer.role !== 'TEACHER') return;
  if (!classroomId) throw new AppError('Como docente, elige una de tus aulas para el evento.', 403);
  const year = await activeYear(viewer.schoolId);
  const [teaches, tutors] = await Promise.all([
    prisma.courseAssignment.count({ where: { schoolId: viewer.schoolId, classroomId, teacherId: viewer.userId, deletedAt: null, academicYearId: year?.id } }),
    prisma.classroom.count({ where: { id: classroomId, schoolId: viewer.schoolId, tutorTeacherId: viewer.userId } }),
  ]);
  if (!teaches && !tutors) throw new AppError('Solo puedes publicar eventos para tus aulas.', 403);
}

function toData(dto: z.infer<typeof eventSchema>) {
  return {
    title: dto.title,
    description: dto.description || null,
    type: dto.type,
    startDate: parseSchoolDate(dto.startDate),
    endDate: dto.endDate && dto.endDate !== dto.startDate ? parseSchoolDate(dto.endDate) : null,
    startTime: dto.startTime || null,
    endTime: dto.startTime ? dto.endTime || null : null,
    location: dto.location || null,
    classroomId: dto.classroomId || null,
    educationLevel: dto.classroomId ? null : dto.educationLevel || null,
    visibleToFamilies: dto.visibleToFamilies,
  };
}

/** Avisa a las familias del alcance del evento (opcional al crearlo). */
async function notifyFamilies(schoolId: string, event: { title: string; startDate: Date; classroomId: string | null; educationLevel: string | null }) {
  const year = await activeYear(schoolId);
  if (!year) return 0;
  const enrollments = await prisma.enrollment.findMany({
    where: {
      schoolId,
      academicYearId: year.id,
      isActive: true,
      ...(event.classroomId ? { classroomId: event.classroomId } : {}),
      ...(event.educationLevel ? { classroom: { educationLevel: event.educationLevel as 'INITIAL' | 'PRIMARY' | 'SECONDARY' } } : {}),
    },
    select: { student: { select: { familyRelations: { where: { user: { isActive: true } }, select: { userId: true } } } } },
  });
  const parents = [...new Set(enrollments.flatMap((e) => e.student.familyRelations.map((r) => r.userId)))];
  if (!parents.length) return 0;
  const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { name: true } });
  const when = new Intl.DateTimeFormat('es-PE', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(event.startDate);
  await deliver(
    schoolId,
    parents.map((userId) => ({ userId })),
    { title: `Nuevo en el calendario: ${event.title}`, message: `El ${when}. Revísalo en el calendario escolar.`, type: 'ANNOUNCEMENT', link: '/calendar' },
    { schoolName: school?.name ?? '' },
  );
  return parents.length;
}

calendarRouter.post('/events', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER'), async (req: Request, res: Response) => {
  const dto = eventSchema.parse(req.body);
  const viewer = viewerOf(req);
  await assertCanTarget(viewer, dto.classroomId);
  if (dto.classroomId) {
    const c = await prisma.classroom.findFirst({ where: { id: dto.classroomId, schoolId: viewer.schoolId }, select: { id: true } });
    if (!c) throw new AppError('Aula no encontrada.', 404);
  }
  const event = await prisma.schoolEvent.create({ data: { ...toData(dto), schoolId: viewer.schoolId, createdById: viewer.userId } });
  const notified = dto.notifyFamilies && dto.visibleToFamilies ? await notifyFamilies(viewer.schoolId, event) : 0;
  recordAudit(req, { action: 'CALENDAR_EVENT_CREATED', entity: 'SchoolEvent', entityId: event.id, after: { titulo: event.title } });
  res.status(201).json({ status: 'success', data: { ...event, notified } });
});

async function loadEditable(viewer: Viewer, id: string) {
  const event = await prisma.schoolEvent.findFirst({ where: { id, schoolId: viewer.schoolId } });
  if (!event) throw new AppError('Evento no encontrado.', 404);
  const canManageAll = ['SCHOOL_ADMIN', 'SUPER_ADMIN', 'ADMINISTRATIVE'].includes(viewer.role);
  if (!canManageAll && event.createdById !== viewer.userId) throw new AppError('Solo quien creó el evento o la Dirección pueden modificarlo.', 403);
  return event;
}

calendarRouter.put('/events/:id', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER'), async (req: Request, res: Response) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
  const dto = eventSchema.parse(req.body);
  const viewer = viewerOf(req);
  await loadEditable(viewer, id);
  await assertCanTarget(viewer, dto.classroomId);
  const updated = await prisma.schoolEvent.update({ where: { id }, data: toData(dto) });
  recordAudit(req, { action: 'CALENDAR_EVENT_UPDATED', entity: 'SchoolEvent', entityId: id, after: { titulo: updated.title } });
  res.status(200).json({ status: 'success', data: updated });
});

calendarRouter.delete('/events/:id', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER'), async (req: Request, res: Response) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
  const event = await loadEditable(viewerOf(req), id);
  await prisma.schoolEvent.delete({ where: { id } });
  recordAudit(req, { action: 'CALENDAR_EVENT_DELETED', entity: 'SchoolEvent', entityId: id, before: { titulo: event.title } });
  res.status(200).json({ status: 'success', data: { deleted: true } });
});

/**
 * Precarga las fechas oficiales del año lectivo activo: feriados nacionales (como días sin clases)
 * y fechas del calendario cívico escolar (como eventos). No duplica lo que ya exista.
 */
calendarRouter.post('/import-official', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN'), async (req: Request, res: Response) => {
  const dto = z.object({ holidays: z.boolean().default(true), civic: z.boolean().default(true) }).parse(req.body);
  const viewer = viewerOf(req);
  const year = await activeYear(viewer.schoolId);
  if (!year) throw new AppError('No hay un año lectivo activo.', 400);
  const start = year.startDate.toISOString().slice(0, 10);
  const end = year.endDate.toISOString().slice(0, 10);
  let holidaysCreated = 0;
  let civicCreated = 0;

  if (dto.holidays) {
    const list = withinRange(nationalHolidays(year.year), start, end);
    const existing = await prisma.schoolHoliday.findMany({ where: { schoolId: viewer.schoolId, date: { in: list.map((h) => parseSchoolDate(h.date)) } }, select: { date: true } });
    const taken = new Set(existing.map((e) => e.date.toISOString().slice(0, 10)));
    const fresh = list.filter((h) => !taken.has(h.date));
    if (fresh.length) {
      await prisma.schoolHoliday.createMany({ data: fresh.map((h) => ({ schoolId: viewer.schoolId, date: parseSchoolDate(h.date), name: h.name })), skipDuplicates: true });
    }
    holidaysCreated = fresh.length;
  }
  if (dto.civic) {
    const list = withinRange(civicDates(year.year), start, end);
    const existing = await prisma.schoolEvent.findMany({
      where: { schoolId: viewer.schoolId, type: 'CIVIC', startDate: { in: list.map((c) => parseSchoolDate(c.date)) } },
      select: { title: true, startDate: true },
    });
    const taken = new Set(existing.map((e) => `${e.startDate.toISOString().slice(0, 10)}|${e.title}`));
    const fresh = list.filter((c) => !taken.has(`${c.date}|${c.name}`));
    if (fresh.length) {
      await prisma.schoolEvent.createMany({
        data: fresh.map((c) => ({ schoolId: viewer.schoolId, title: c.name, type: 'CIVIC' as const, startDate: parseSchoolDate(c.date), visibleToFamilies: true, createdById: viewer.userId })),
      });
    }
    civicCreated = fresh.length;
  }
  recordAudit(req, { action: 'CALENDAR_OFFICIAL_IMPORTED', entity: 'SchoolEvent', after: { feriados: holidaysCreated, fechasCivicas: civicCreated } });
  res.status(200).json({ status: 'success', data: { holidaysCreated, civicCreated } });
});
