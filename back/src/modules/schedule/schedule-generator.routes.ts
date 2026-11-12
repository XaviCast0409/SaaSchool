import { Router, Request, Response } from 'express';
import { z } from 'zod';
import type { EducationLevel, Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../core/errors/app-error';
import { authMiddleware, authorizeRoles } from '../../core/middlewares/auth.middleware';
import { tenantMiddleware } from '../../core/middlewares/tenant.middleware';
import { recordAudit } from '../../utils/audit.util';
import { classroomLabel } from '../automations/recipients';
import { activeYear } from './schedule.access';
import { DAY_NAMES, findTeacherConflicts, validateClassroomBlocks } from './schedule.rules';
import { generateTimetable, type GenClassroom, type Interval, type TemplateSlot } from './timetable-generator';

/**
 * Armado automático de horarios: jornada por nivel, horas y preferencias por curso, disponibilidad
 * de docentes, generación de una propuesta (sin guardar) y aplicación de la propuesta revisada.
 */
export const scheduleGeneratorRouter = Router();
scheduleGeneratorRouter.use(authMiddleware, tenantMiddleware, authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN'));

const LEVELS = ['INITIAL', 'PRIMARY', 'SECONDARY'] as const;
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const fullName = (u: { firstName: string; lastNamePaternal: string }) => `${u.firstName} ${u.lastNamePaternal}`;

const s = (start: string, end: string, kind: 'CLASS' | 'BREAK' = 'CLASS', label?: string): TemplateSlot => ({ start, end, kind, ...(label ? { label } : {}) });

/** Jornadas sugeridas (editables) cuando el colegio aún no configura la suya. */
export const DEFAULT_TEMPLATES: Record<EducationLevel, TemplateSlot[]> = {
  INITIAL: [s('08:00', '08:45'), s('08:45', '09:30'), s('09:30', '10:00', 'BREAK', 'Refrigerio'), s('10:00', '10:45'), s('10:45', '11:30'), s('11:30', '11:50', 'BREAK', 'Recreo'), s('11:50', '12:35')],
  PRIMARY: [s('08:00', '08:45'), s('08:45', '09:30'), s('09:30', '09:50', 'BREAK', 'Recreo'), s('09:50', '10:35'), s('10:35', '11:20'), s('11:20', '11:40', 'BREAK', 'Recreo'), s('11:40', '12:25'), s('12:25', '13:10')],
  SECONDARY: [s('07:45', '08:30'), s('08:30', '09:15'), s('09:15', '10:00'), s('10:00', '10:20', 'BREAK', 'Recreo'), s('10:20', '11:05'), s('11:05', '11:50'), s('11:50', '12:05', 'BREAK', 'Recreo'), s('12:05', '12:50'), s('12:50', '13:35')],
};

const slotSchema = z.object({ start: time, end: time, kind: z.enum(['CLASS', 'BREAK']), label: z.string().trim().max(30).optional() });
const templateSchema = z
  .object({ days: z.array(z.number().int().min(1).max(6)).min(1).max(6), slots: z.array(slotSchema).min(1).max(16) })
  .superRefine((v, ctx) => {
    v.slots.forEach((sl, i) => {
      if (sl.start >= sl.end) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['slots', i], message: `Fila ${i + 1}: el fin debe ser posterior al inicio.` });
      if (i > 0 && v.slots[i - 1].end > sl.start) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['slots', i], message: `Fila ${i + 1}: se cruza con la anterior.` });
    });
    if (!v.slots.some((sl) => sl.kind === 'CLASS')) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['slots'], message: 'La jornada necesita al menos una hora de clase.' });
  });

async function requireYear(schoolId: string) {
  const year = await activeYear(schoolId);
  if (!year) throw new AppError('No hay un año lectivo activo.', 400);
  return year;
}

async function templatesFor(schoolId: string, academicYearId: string) {
  const rows = await prisma.timetableTemplate.findMany({ where: { schoolId, academicYearId } });
  const map = new Map<EducationLevel, { days: number[]; slots: TemplateSlot[]; custom: boolean }>();
  for (const l of LEVELS) map.set(l, { days: [1, 2, 3, 4, 5], slots: DEFAULT_TEMPLATES[l], custom: false });
  for (const r of rows) map.set(r.educationLevel, { days: r.days, slots: r.slots as unknown as TemplateSlot[], custom: true });
  return map;
}

/** Cursos de cada aula con sus horas del plan de estudios y preferencias. */
async function classroomsWithCourses(schoolId: string, academicYearId: string, classroomIds?: string[]) {
  const [classrooms, plan] = await Promise.all([
    prisma.classroom.findMany({
      where: { schoolId, ...(classroomIds ? { id: { in: classroomIds } } : {}) },
      orderBy: [{ educationLevel: 'asc' }, { grade: 'asc' }, { section: 'asc' }],
      select: {
        id: true,
        grade: true,
        section: true,
        educationLevel: true,
        assignments: {
          // Las competencias transversales no ocupan horas propias en el horario
          where: { academicYearId, deletedAt: null, area: { isTransversal: false } },
          select: { id: true, areaId: true, area: { select: { name: true } }, teacher: { select: { id: true, firstName: true, lastNamePaternal: true } } },
          orderBy: { area: { name: 'asc' } },
        },
        _count: { select: { scheduleBlocks: { where: { academicYearId } } } },
      },
    }),
    prisma.studyPlanCourse.findMany({ where: { schoolId, academicYearId } }),
  ]);
  const planOf = (level: EducationLevel, grade: number, areaId: string) => plan.find((p) => p.educationLevel === level && p.grade === grade && p.areaId === areaId);
  return classrooms.map((c) => ({
    id: c.id,
    label: classroomLabel(c),
    level: c.educationLevel,
    grade: c.grade,
    hasSchedule: c._count.scheduleBlocks > 0,
    courses: c.assignments.map((a) => {
      const p = planOf(c.educationLevel, c.grade, a.areaId);
      return {
        assignmentId: a.id,
        name: a.area.name,
        teacherId: a.teacher.id,
        teacherName: fullName(a.teacher),
        studyPlanCourseId: p?.id ?? null,
        hours: p?.weeklyHours ?? null,
        preferDoubleBlock: p?.preferDoubleBlock ?? true,
        maxHoursPerDay: p?.maxHoursPerDay ?? 2,
        preferEarly: p?.preferEarly ?? false,
      };
    }),
  }));
}

const parseUnavailable = (list: string[]): Interval[] =>
  list
    .map((x) => x.split('|'))
    .filter((p) => p.length === 3)
    .map(([d, start, end]) => ({ day: Number(d), start, end }));

/** Todo lo que necesita el asistente en una sola llamada. */
scheduleGeneratorRouter.get('/setup', async (req: Request, res: Response) => {
  const schoolId = req.user!.schoolId;
  const year = await requireYear(schoolId);
  const [school, templates, classrooms, availability] = await Promise.all([
    prisma.school.findUnique({ where: { id: schoolId }, select: { offeredLevels: true } }),
    templatesFor(schoolId, year.id),
    classroomsWithCourses(schoolId, year.id),
    prisma.teacherAvailability.findMany({ where: { schoolId, academicYearId: year.id } }),
  ]);
  const teachers = new Map<string, { id: string; name: string; hours: number; unavailable: string[] }>();
  for (const c of classrooms) {
    for (const course of c.courses) {
      const t = teachers.get(course.teacherId) ?? { id: course.teacherId, name: course.teacherName, hours: 0, unavailable: [] };
      t.hours += course.hours ?? 0;
      teachers.set(course.teacherId, t);
    }
  }
  for (const a of availability) if (teachers.has(a.teacherId)) teachers.get(a.teacherId)!.unavailable = a.unavailable;
  const levels = (school?.offeredLevels ?? ['PRIMARY', 'SECONDARY']).map((l) => ({ level: l, ...templates.get(l)! }));
  res.status(200).json({
    status: 'success',
    data: { levels, classrooms, teachers: [...teachers.values()].sort((a, b) => a.name.localeCompare(b.name)) },
  });
});

scheduleGeneratorRouter.put('/templates/:level', async (req: Request, res: Response) => {
  const { level } = z.object({ level: z.enum(LEVELS) }).parse(req.params);
  const dto = templateSchema.parse(req.body);
  const schoolId = req.user!.schoolId;
  const year = await requireYear(schoolId);
  const days = [...new Set(dto.days)].sort();
  const slots = dto.slots as unknown as Prisma.InputJsonValue;
  await prisma.timetableTemplate.upsert({
    where: { academicYearId_educationLevel: { academicYearId: year.id, educationLevel: level } },
    create: { schoolId, academicYearId: year.id, educationLevel: level, days, slots },
    update: { days, slots },
  });
  res.status(200).json({ status: 'success', data: { level, days, slots: dto.slots } });
});

scheduleGeneratorRouter.put('/availability/:teacherId', async (req: Request, res: Response) => {
  const { teacherId } = z.object({ teacherId: z.string().uuid() }).parse(req.params);
  const { unavailable } = z.object({ unavailable: z.array(z.string().regex(/^[1-6]\|([01]\d|2[0-3]):[0-5]\d\|([01]\d|2[0-3]):[0-5]\d$/)).max(100) }).parse(req.body);
  const schoolId = req.user!.schoolId;
  const year = await requireYear(schoolId);
  const teacher = await prisma.user.findFirst({ where: { id: teacherId, schoolId }, select: { id: true } });
  if (!teacher) throw new AppError('Docente no encontrado.', 404);
  const list = [...new Set(unavailable)];
  await prisma.teacherAvailability.upsert({
    where: { academicYearId_teacherId: { academicYearId: year.id, teacherId } },
    create: { schoolId, academicYearId: year.id, teacherId, unavailable: list },
    update: { unavailable: list },
  });
  res.status(200).json({ status: 'success', data: { teacherId, unavailable: list } });
});

/** Horas y preferencias del curso en el plan de estudios (las mismas que ve la página del plan). */
scheduleGeneratorRouter.patch('/plan-course/:id', async (req: Request, res: Response) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
  const dto = z
    .object({
      weeklyHours: z.number().int().min(0).max(40).nullable().optional(),
      preferDoubleBlock: z.boolean().optional(),
      maxHoursPerDay: z.number().int().min(1).max(6).optional(),
      preferEarly: z.boolean().optional(),
    })
    .parse(req.body);
  const course = await prisma.studyPlanCourse.findFirst({ where: { id, schoolId: req.user!.schoolId }, select: { id: true } });
  if (!course) throw new AppError('Curso del plan no encontrado.', 404);
  const updated = await prisma.studyPlanCourse.update({ where: { id }, data: dto });
  res.status(200).json({ status: 'success', data: updated });
});

/** Genera una propuesta para las aulas elegidas. No guarda nada. */
scheduleGeneratorRouter.post('/generate', async (req: Request, res: Response) => {
  const { classroomIds, seed } = z.object({ classroomIds: z.array(z.string().uuid()).min(1).max(60), seed: z.number().int().optional() }).parse(req.body);
  const schoolId = req.user!.schoolId;
  const year = await requireYear(schoolId);
  const [templates, classrooms, availability, fixedBlocks] = await Promise.all([
    templatesFor(schoolId, year.id),
    classroomsWithCourses(schoolId, year.id, classroomIds),
    prisma.teacherAvailability.findMany({ where: { schoolId, academicYearId: year.id } }),
    // Horarios ya guardados de las aulas que NO se regeneran: sus docentes están ocupados ahí
    prisma.scheduleBlock.findMany({
      where: { schoolId, academicYearId: year.id, classroomId: { notIn: classroomIds }, courseAssignmentId: { not: null } },
      select: { dayOfWeek: true, startTime: true, endTime: true, courseAssignment: { select: { teacherId: true } } },
    }),
  ]);
  if (classrooms.length !== classroomIds.length) throw new AppError('Alguna de las aulas no pertenece al colegio.', 400);

  const teacherBusy: Record<string, Interval[]> = {};
  for (const b of fixedBlocks) {
    const t = b.courseAssignment!.teacherId;
    (teacherBusy[t] ??= []).push({ day: b.dayOfWeek, start: b.startTime, end: b.endTime });
  }
  for (const a of availability) (teacherBusy[a.teacherId] ??= []).push(...parseUnavailable(a.unavailable));

  const missingConfig: string[] = [];
  const genClassrooms: GenClassroom[] = classrooms.map((c) => {
    const tpl = templates.get(c.level)!;
    return {
      id: c.id,
      label: c.label,
      days: tpl.days,
      slots: tpl.slots,
      courses: c.courses
        .filter((x) => {
          if (x.hours === null) missingConfig.push(`${c.label} · ${x.name}: sin horas semanales en el plan de estudios.`);
          return (x.hours ?? 0) > 0;
        })
        .map((x) => ({
          assignmentId: x.assignmentId,
          teacherId: x.teacherId,
          name: x.name,
          hours: x.hours!,
          preferDouble: x.preferDoubleBlock,
          maxPerDay: x.maxHoursPerDay,
          preferEarly: x.preferEarly,
        })),
    };
  });

  // Aulas sin carga docente (o sin horas) se omiten: no se toca su horario actual
  const skipped = genClassrooms.filter((c) => c.courses.length === 0);
  for (const c of skipped) missingConfig.unshift(`${c.label}: sin cursos con docente y horas asignadas; se omite y conserva su horario actual.`);
  const toGenerate = genClassrooms.filter((c) => c.courses.length > 0);
  if (toGenerate.length === 0) throw new AppError('Ninguna de las aulas elegidas tiene carga docente con horas. Revisa la carga docente y el plan de estudios.', 400);

  const t0 = Date.now();
  const result = generateTimetable({ classrooms: toGenerate, teacherBusy, seed });
  const courseInfo = new Map(classrooms.flatMap((c) => c.courses.map((x) => [x.assignmentId, x] as const)));

  // Propuesta por aula: clases + recreos de la jornada
  const proposal = toGenerate.map((gc) => {
    const blocks = result.placements
      .filter((p) => p.classroomId === gc.id)
      .map((p) => {
        const info = courseInfo.get(p.assignmentId)!;
        return {
          dayOfWeek: p.day,
          startTime: gc.slots[p.slotIndexes[0]].start,
          endTime: gc.slots[p.slotIndexes[p.slotIndexes.length - 1]].end,
          courseAssignmentId: p.assignmentId,
          courseName: info.name,
          teacherName: info.teacherName,
          label: null as string | null,
          room: null as string | null,
        };
      });
    for (const day of gc.days) {
      for (const sl of gc.slots.filter((x) => x.kind === 'BREAK')) {
        blocks.push({ dayOfWeek: day, startTime: sl.start, endTime: sl.end, courseAssignmentId: null as unknown as string, courseName: null as unknown as string, teacherName: null as unknown as string, label: sl.label || 'Recreo', room: null });
      }
    }
    blocks.sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime));
    const required = gc.courses.reduce((s2, x) => s2 + x.hours, 0);
    const placed = result.placements.filter((p) => p.classroomId === gc.id).reduce((s2, p) => s2 + p.slotIndexes.length, 0);
    return { classroomId: gc.id, label: gc.label, blocks, requiredHours: required, placedHours: placed };
  });

  res.status(200).json({
    status: 'success',
    data: { proposal, unplaced: result.unplaced, warnings: [...missingConfig, ...result.warnings], elapsedMs: Date.now() - t0 },
  });
});

const applySchema = z.object({
  classrooms: z
    .array(
      z.object({
        classroomId: z.string().uuid(),
        blocks: z
          .array(
            z.object({
              dayOfWeek: z.number().int().min(1).max(6),
              startTime: z.string(),
              endTime: z.string(),
              courseAssignmentId: z.string().uuid().nullable(),
              label: z.string().trim().max(40).nullable().optional(),
              room: z.string().trim().max(60).nullable().optional(),
            }),
          )
          .max(80),
      }),
    )
    .min(1)
    .max(60),
});

/**
 * Guarda la propuesta (revisada) de varias aulas a la vez, en una sola transacción.
 * Revalida cruces dentro de cada aula, entre las aulas aplicadas y con las demás aulas guardadas.
 */
scheduleGeneratorRouter.post('/apply', async (req: Request, res: Response) => {
  const dto = applySchema.parse(req.body);
  const schoolId = req.user!.schoolId;
  const year = await requireYear(schoolId);
  const ids = dto.classrooms.map((c) => c.classroomId);

  const assignments = await prisma.courseAssignment.findMany({
    where: { schoolId, academicYearId: year.id, deletedAt: null, classroomId: { in: ids } },
    select: { id: true, classroomId: true, teacherId: true, area: { select: { name: true } }, classroom: { select: { grade: true, section: true, educationLevel: true } } },
  });
  const assignmentOf = new Map(assignments.map((a) => [a.id, a]));

  const errors: string[] = [];
  const proposed: Array<{ dayOfWeek: number; startTime: string; endTime: string; teacherId: string | null; courseName?: string; classroomLabel?: string }> = [];
  for (const c of dto.classrooms) {
    const blockErrors = validateClassroomBlocks(c.blocks);
    if (blockErrors.length) errors.push(...blockErrors.slice(0, 2));
    for (const b of c.blocks) {
      if (!b.courseAssignmentId) continue;
      const a = assignmentOf.get(b.courseAssignmentId);
      if (!a || a.classroomId !== c.classroomId) {
        errors.push('Un curso no pertenece a su aula.');
        continue;
      }
      proposed.push({ ...b, teacherId: a.teacherId, courseName: a.area.name, classroomLabel: classroomLabel(a.classroom) });
    }
  }
  if (errors.length) throw new AppError(errors.slice(0, 5).join(' '), 400);

  // Cruces entre las aulas que se aplican
  const internal: string[] = [];
  for (let i = 0; i < proposed.length; i++) {
    for (let j = i + 1; j < proposed.length; j++) {
      const x = proposed[i];
      const y = proposed[j];
      if (x.teacherId && x.teacherId === y.teacherId && x.dayOfWeek === y.dayOfWeek && x.startTime < y.endTime && y.startTime < x.endTime) {
        internal.push(`${DAY_NAMES[x.dayOfWeek]} ${x.startTime}: el docente de ${x.courseName} quedaría en ${x.classroomLabel} y ${y.classroomLabel}.`);
      }
    }
  }
  // Cruces con las demás aulas ya guardadas
  const others = await prisma.scheduleBlock.findMany({
    where: { schoolId, academicYearId: year.id, classroomId: { notIn: ids }, courseAssignmentId: { not: null } },
    select: {
      dayOfWeek: true,
      startTime: true,
      endTime: true,
      classroom: { select: { grade: true, section: true, educationLevel: true } },
      courseAssignment: { select: { teacherId: true, area: { select: { name: true } } } },
    },
  });
  const external = findTeacherConflicts(
    proposed,
    others.map((o) => ({ dayOfWeek: o.dayOfWeek, startTime: o.startTime, endTime: o.endTime, teacherId: o.courseAssignment!.teacherId, courseName: o.courseAssignment!.area.name, classroomLabel: classroomLabel(o.classroom) })),
  );
  const conflicts = [...new Set([...internal, ...external])];
  if (conflicts.length) {
    res.status(409).json({ status: 'fail', message: 'La propuesta tiene docentes con dos clases a la misma hora.', data: { conflicts } });
    return;
  }

  await prisma.$transaction([
    prisma.scheduleBlock.deleteMany({ where: { schoolId, academicYearId: year.id, classroomId: { in: ids } } }),
    prisma.scheduleBlock.createMany({
      data: dto.classrooms.flatMap((c) =>
        c.blocks.map((b) => ({
          schoolId,
          academicYearId: year.id,
          classroomId: c.classroomId,
          dayOfWeek: b.dayOfWeek,
          startTime: b.startTime,
          endTime: b.endTime,
          courseAssignmentId: b.courseAssignmentId,
          label: b.courseAssignmentId ? null : b.label || 'Recreo',
          room: b.room || null,
        })),
      ),
    }),
  ]);
  recordAudit(req, { action: 'SCHEDULE_GENERATED', entity: 'ScheduleBlock', after: { aulas: ids.length, bloques: dto.classrooms.reduce((s2, c) => s2 + c.blocks.length, 0) } });
  res.status(200).json({ status: 'success', data: { classrooms: ids.length } });
});

/** Reporte de cruces de docentes en todo el colegio (incluye los guardados "de todos modos"). */
scheduleGeneratorRouter.get('/conflicts', async (req: Request, res: Response) => {
  const schoolId = req.user!.schoolId;
  const year = await requireYear(schoolId);
  const blocks = await prisma.scheduleBlock.findMany({
    where: { schoolId, academicYearId: year.id, courseAssignmentId: { not: null } },
    select: {
      classroomId: true,
      dayOfWeek: true,
      startTime: true,
      endTime: true,
      classroom: { select: { grade: true, section: true, educationLevel: true } },
      courseAssignment: { select: { teacherId: true, area: { select: { name: true } }, teacher: { select: { firstName: true, lastNamePaternal: true } } } },
    },
  });
  const conflicts: Array<{ teacherName: string; day: string; time: string; detail: string }> = [];
  for (let i = 0; i < blocks.length; i++) {
    for (let j = i + 1; j < blocks.length; j++) {
      const x = blocks[i];
      const y = blocks[j];
      const tx = x.courseAssignment!;
      const ty = y.courseAssignment!;
      if (tx.teacherId !== ty.teacherId || x.classroomId === y.classroomId || x.dayOfWeek !== y.dayOfWeek) continue;
      if (!(x.startTime < y.endTime && y.startTime < x.endTime)) continue;
      conflicts.push({
        teacherName: fullName(tx.teacher),
        day: DAY_NAMES[x.dayOfWeek],
        time: `${x.startTime < y.startTime ? x.startTime : y.startTime}–${x.endTime > y.endTime ? x.endTime : y.endTime}`,
        detail: `${tx.area.name} en ${classroomLabel(x.classroom)} (${x.startTime}–${x.endTime}) y ${ty.area.name} en ${classroomLabel(y.classroom)} (${y.startTime}–${y.endTime})`,
      });
    }
  }
  res.status(200).json({ status: 'success', data: conflicts });
});
