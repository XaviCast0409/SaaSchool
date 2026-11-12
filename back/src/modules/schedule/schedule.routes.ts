import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { AppError } from '../../core/errors/app-error';
import { authMiddleware, authorizeRoles } from '../../core/middlewares/auth.middleware';
import { tenantMiddleware } from '../../core/middlewares/tenant.middleware';
import { recordAudit } from '../../utils/audit.util';
import { getSchoolNow, parseSchoolDate } from '../../utils/timezone.util';
import { classroomLabel, studentShortName } from '../automations/recipients';
import { addDays, limaDayRange } from '../automations/automation.rules';
import { activeYear, assertStudentAccess, currentEnrollment, type Viewer } from './schedule.access';
import { findTeacherConflicts, sortBlocks, validateClassroomBlocks, weeklyMinutesByCourse, weekdayOf } from './schedule.rules';

/** Horario semanal por aula, horario del docente y "¿qué toca mañana?" para familias y alumnos. */
export const scheduleRouter = Router();
scheduleRouter.use(authMiddleware, tenantMiddleware);

const uuid = z.string().uuid();
const viewerOf = (req: Request): Viewer => ({
  userId: req.user!.userId,
  role: req.user!.role,
  schoolId: req.user!.schoolId,
  studentId: req.user!.studentId,
});
const teacherName = (t: { firstName: string; lastNamePaternal: string } | null | undefined) => (t ? `${t.firstName} ${t.lastNamePaternal}` : null);

const BLOCK_INCLUDE = {
  courseAssignment: {
    select: {
      id: true,
      area: { select: { name: true } },
      teacher: { select: { id: true, firstName: true, lastNamePaternal: true } },
    },
  },
} as const;

type BlockRow = {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  label: string | null;
  room: string | null;
  courseAssignmentId: string | null;
  courseAssignment: { id: string; area: { name: string }; teacher: { id: string; firstName: string; lastNamePaternal: string } } | null;
};

const presentBlock = (b: BlockRow) => ({
  id: b.id,
  dayOfWeek: b.dayOfWeek,
  startTime: b.startTime,
  endTime: b.endTime,
  room: b.room,
  label: b.label,
  courseAssignmentId: b.courseAssignmentId,
  courseName: b.courseAssignment?.area.name ?? null,
  teacherName: teacherName(b.courseAssignment?.teacher),
});

/** Horario de un aula + cursos disponibles para armarlo (editor de la Dirección). */
scheduleRouter.get('/classroom/:classroomId', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER'), async (req: Request, res: Response) => {
  const { classroomId } = z.object({ classroomId: uuid }).parse(req.params);
  const schoolId = req.user!.schoolId;
  const year = await activeYear(schoolId);
  if (!year) throw new AppError('No hay un año lectivo activo.', 400);
  const classroom = await prisma.classroom.findFirst({ where: { id: classroomId, schoolId }, select: { id: true, grade: true, section: true, educationLevel: true } });
  if (!classroom) throw new AppError('Aula no encontrada.', 404);

  const [blocks, assignments] = await Promise.all([
    prisma.scheduleBlock.findMany({ where: { schoolId, classroomId, academicYearId: year.id }, include: BLOCK_INCLUDE }),
    prisma.courseAssignment.findMany({
      where: { schoolId, classroomId, academicYearId: year.id, deletedAt: null },
      select: { id: true, area: { select: { name: true } }, teacher: { select: { firstName: true, lastNamePaternal: true } } },
      orderBy: { area: { name: 'asc' } },
    }),
  ]);
  const minutes = weeklyMinutesByCourse(blocks);
  res.status(200).json({
    status: 'success',
    data: {
      classroom: { ...classroom, label: classroomLabel(classroom) },
      blocks: sortBlocks(blocks).map(presentBlock),
      courses: assignments.map((a) => ({ id: a.id, name: a.area.name, teacherName: teacherName(a.teacher), weeklyMinutes: minutes.get(a.id) ?? 0 })),
    },
  });
});

const blockInput = z.object({
  dayOfWeek: z.number().int().min(1).max(6),
  startTime: z.string(),
  endTime: z.string(),
  courseAssignmentId: uuid.nullable().optional(),
  label: z.string().trim().max(40).nullable().optional(),
  room: z.string().trim().max(60).nullable().optional(),
});
const saveSchema = z.object({ blocks: z.array(blockInput).max(80), allowTeacherConflicts: z.boolean().optional() });

/** Guarda el horario completo del aula. Valida cruces internos y choques de docentes con otras aulas. */
scheduleRouter.put('/classroom/:classroomId', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN'), async (req: Request, res: Response) => {
  const { classroomId } = z.object({ classroomId: uuid }).parse(req.params);
  const dto = saveSchema.parse(req.body);
  const schoolId = req.user!.schoolId;
  const year = await activeYear(schoolId);
  if (!year) throw new AppError('No hay un año lectivo activo.', 400);
  const classroom = await prisma.classroom.findFirst({ where: { id: classroomId, schoolId }, select: { id: true } });
  if (!classroom) throw new AppError('Aula no encontrada.', 404);

  const blocks = dto.blocks.map((b) => ({
    ...b,
    courseAssignmentId: b.courseAssignmentId || null,
    label: b.courseAssignmentId ? null : b.label?.trim() || 'Recreo',
    room: b.room?.trim() || null,
  }));
  const errors = validateClassroomBlocks(blocks);
  if (errors.length) throw new AppError(errors.slice(0, 5).join(' '), 400);

  const assignments = await prisma.courseAssignment.findMany({
    where: { schoolId, classroomId, academicYearId: year.id, deletedAt: null },
    select: { id: true, teacherId: true, area: { select: { name: true } } },
  });
  const assignmentOf = new Map(assignments.map((a) => [a.id, a]));
  for (const b of blocks) {
    if (b.courseAssignmentId && !assignmentOf.has(b.courseAssignmentId)) throw new AppError('Uno de los cursos no pertenece a esta aula.', 400);
  }

  // Choques de docentes con el horario de otras aulas
  const teacherIds = [...new Set(assignments.map((a) => a.teacherId))];
  const others = await prisma.scheduleBlock.findMany({
    where: { schoolId, academicYearId: year.id, classroomId: { not: classroomId }, courseAssignment: { teacherId: { in: teacherIds } } },
    select: {
      dayOfWeek: true,
      startTime: true,
      endTime: true,
      classroom: { select: { grade: true, section: true, educationLevel: true } },
      courseAssignment: { select: { teacherId: true, area: { select: { name: true } } } },
    },
  });
  const conflicts = findTeacherConflicts(
    blocks.map((b) => {
      const a = b.courseAssignmentId ? assignmentOf.get(b.courseAssignmentId) : undefined;
      return { ...b, teacherId: a?.teacherId ?? null, courseName: a?.area.name };
    }),
    others.map((o) => ({
      dayOfWeek: o.dayOfWeek,
      startTime: o.startTime,
      endTime: o.endTime,
      teacherId: o.courseAssignment?.teacherId ?? null,
      courseName: o.courseAssignment?.area.name,
      classroomLabel: classroomLabel(o.classroom),
    })),
  );
  if (conflicts.length && !dto.allowTeacherConflicts) {
    res.status(409).json({ status: 'fail', message: 'Hay docentes con dos clases a la misma hora.', data: { conflicts } });
    return;
  }

  await prisma.$transaction([
    prisma.scheduleBlock.deleteMany({ where: { schoolId, classroomId, academicYearId: year.id } }),
    prisma.scheduleBlock.createMany({
      data: blocks.map((b) => ({ ...b, schoolId, classroomId, academicYearId: year.id })),
    }),
  ]);
  recordAudit(req, { action: 'SCHEDULE_SAVED', entity: 'Classroom', entityId: classroomId, after: { bloques: blocks.length, choquesAceptados: conflicts.length } });
  res.status(200).json({ status: 'success', data: { saved: blocks.length, conflicts } });
});

/** Horario semanal del docente que inicia sesión (todas sus aulas). */
scheduleRouter.get('/teacher/me', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER'), async (req: Request, res: Response) => {
  const schoolId = req.user!.schoolId;
  const year = await activeYear(schoolId);
  if (!year) {
    res.status(200).json({ status: 'success', data: { blocks: [] } });
    return;
  }
  const blocks = await prisma.scheduleBlock.findMany({
    where: { schoolId, academicYearId: year.id, courseAssignment: { teacherId: req.user!.userId } },
    include: { ...BLOCK_INCLUDE, classroom: { select: { grade: true, section: true, educationLevel: true } } },
  });
  res.status(200).json({
    status: 'success',
    data: { blocks: sortBlocks(blocks).map((b) => ({ ...presentBlock(b), classroomLabel: classroomLabel(b.classroom) })) },
  });
});

/** Horario semanal de un alumno (su aula). */
scheduleRouter.get('/student/:studentId', async (req: Request, res: Response) => {
  const { studentId } = z.object({ studentId: uuid }).parse(req.params);
  const viewer = viewerOf(req);
  await assertStudentAccess(viewer, studentId);
  const enrollment = await currentEnrollment(viewer.schoolId, studentId);
  if (!enrollment) {
    res.status(200).json({ status: 'success', data: { classroom: null, blocks: [] } });
    return;
  }
  const blocks = await prisma.scheduleBlock.findMany({
    where: { schoolId: viewer.schoolId, classroomId: enrollment.classroomId, academicYearId: enrollment.academicYearId },
    include: BLOCK_INCLUDE,
  });
  res.status(200).json({
    status: 'success',
    data: { classroom: { ...enrollment.classroom, label: classroomLabel(enrollment.classroom) }, blocks: sortBlocks(blocks).map(presentBlock) },
  });
});

/**
 * "¿Qué toca?" para un día: clases, tareas que vencen, eventos y si es feriado.
 * Por defecto, el próximo día lectivo (mañana, o el lunes si hoy es viernes o sábado).
 */
scheduleRouter.get('/day', async (req: Request, res: Response) => {
  const q = z.object({ studentId: uuid, date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }).parse(req.query);
  const viewer = viewerOf(req);
  await assertStudentAccess(viewer, q.studentId);

  let date = q.date;
  if (!date) {
    date = addDays(getSchoolNow().dateStr, 1);
    while (weekdayOf(date) === 0 || weekdayOf(date) === 6) date = addDays(date, 1);
  }
  const weekday = weekdayOf(date);
  const enrollment = await currentEnrollment(viewer.schoolId, q.studentId);
  const student = await prisma.student.findUnique({ where: { id: q.studentId }, select: { firstNames: true, lastNamePaternal: true } });

  const [holiday, blocks, homeworks, events] = await Promise.all([
    prisma.schoolHoliday.findFirst({ where: { schoolId: viewer.schoolId, date: parseSchoolDate(date) }, select: { name: true } }),
    enrollment
      ? prisma.scheduleBlock.findMany({
          where: { schoolId: viewer.schoolId, classroomId: enrollment.classroomId, academicYearId: enrollment.academicYearId, dayOfWeek: weekday },
          include: BLOCK_INCLUDE,
        })
      : Promise.resolve([]),
    enrollment
      ? prisma.courseContent.findMany({
          where: {
            schoolId: viewer.schoolId,
            contentType: 'HOMEWORK',
            dueDate: limaDayRange(date),
            courseAssignment: { classroomId: enrollment.classroomId, academicYearId: enrollment.academicYearId, deletedAt: null },
          },
          select: {
            id: true,
            title: true,
            dueDate: true,
            courseAssignment: { select: { area: { select: { name: true } } } },
            submissions: { where: { enrollmentId: enrollment.id }, select: { id: true } },
          },
        })
      : Promise.resolve([]),
    prisma.schoolEvent.findMany({
      where: {
        schoolId: viewer.schoolId,
        visibleToFamilies: true,
        startDate: { lte: parseSchoolDate(date) },
        OR: [{ endDate: null, startDate: parseSchoolDate(date) }, { endDate: { gte: parseSchoolDate(date) } }],
        AND: [
          { OR: [{ classroomId: null }, { classroomId: enrollment?.classroomId ?? '00000000-0000-0000-0000-000000000000' }] },
          { OR: [{ educationLevel: null }, { educationLevel: enrollment?.classroom.educationLevel ?? undefined }] },
        ],
      },
      select: { id: true, title: true, type: true, startTime: true, endTime: true, location: true },
      orderBy: { startTime: 'asc' },
    }),
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      date,
      weekday,
      studentName: student ? studentShortName(student) : '',
      holiday: holiday?.name ?? null,
      blocks: sortBlocks(blocks).map(presentBlock),
      homeworks: homeworks.map((h) => ({ id: h.id, title: h.title, courseName: h.courseAssignment.area.name, dueDate: h.dueDate, submitted: h.submissions.length > 0 })),
      events,
    },
  });
});
