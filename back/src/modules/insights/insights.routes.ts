import { Router, Request, Response } from 'express';
import { z } from 'zod';
import type { EducationLevel, Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../core/errors/app-error';
import { authMiddleware, authorizeRoles } from '../../core/middlewares/auth.middleware';
import { tenantMiddleware } from '../../core/middlewares/tenant.middleware';
import { recordAudit } from '../../utils/audit.util';
import { getPeriodDateRange } from '../../utils/period-dates.util';
import { getSchoolNow, parseSchoolDate } from '../../utils/timezone.util';
import { periodCount, periodName } from '../academic/academic.context';
import { PeriodService } from '../academic/period.service';
import { addDays } from '../automations/automation.rules';
import { classroomLabel } from '../automations/recipients';
import { remainingBalance } from '../payments/payment.rules';
import { activeYear } from '../schedule/schedule.access';
import { addLetter, computeRisk, countDrops, emptyTally, siagieIssues, type LetterTally } from './insights.rules';

/**
 * Inteligencia para la Dirección: panel de acciones, alerta temprana académica con plan de tutoría,
 * mapa de calor por aula y área, y revisión de datos para el SIAGIE.
 */
export const insightsRouter = Router();
insightsRouter.use(authMiddleware, tenantMiddleware);

const ADMINS = ['SUPER_ADMIN', 'SCHOOL_ADMIN'] as const;
const DAY = 86_400_000;
const money = (n: number) => `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fullName = (s: { firstNames: string; lastNamePaternal: string; lastNameMaternal?: string | null }) => `${s.lastNamePaternal} ${s.lastNameMaternal ?? ''}, ${s.firstNames}`.replace(/\s+,/, ',').trim();

async function requireYear(schoolId: string) {
  const y = await prisma.academicYear.findFirst({
    where: { schoolId, isActive: true },
    orderBy: { year: 'desc' },
    select: { id: true, year: true, startDate: true, endDate: true, periodType: true, periodsConfig: true },
  });
  if (!y) throw new AppError('No hay un año lectivo activo.', 400);
  return y;
}

/** Periodo en curso según las fechas del año (o el último que ya terminó). */
function currentPeriod(year: Awaited<ReturnType<typeof requireYear>>): number {
  const today = parseSchoolDate(getSchoolNow().dateStr);
  let last = 1;
  for (let p = 1; p <= periodCount(year); p++) {
    const r = getPeriodDateRange(year, p);
    if (today >= r.startDate && today <= r.endDate) return p;
    if (today > r.endDate) last = p;
  }
  return last;
}

/** Aulas que puede ver: la Dirección todas; un docente solo las que tutora. */
async function visibleClassroomIds(req: Request): Promise<string[] | null> {
  const role = req.user!.role;
  if (role === 'SCHOOL_ADMIN' || role === 'SUPER_ADMIN') return null;
  if (role === 'TEACHER') {
    const rows = await prisma.classroom.findMany({ where: { schoolId: req.user!.schoolId, tutorTeacherId: req.user!.userId }, select: { id: true } });
    return rows.map((r) => r.id);
  }
  throw new AppError('Esta información es reservada para la Dirección y los tutores.', 403);
}

// ------------------------------------------------------------------ Panel de acciones

type Severity = 'high' | 'medium' | 'low';
interface ActionItem {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
  count: number;
  link: string;
}

insightsRouter.get('/actions', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE'), async (req: Request, res: Response) => {
  const schoolId = req.user!.schoolId;
  const isAdmin = req.user!.role !== 'ADMINISTRATIVE';
  const year = await activeYear(schoolId);
  const today = getSchoolNow().dateStr;
  const todayDate = parseSchoolDate(today);
  const weekAhead = parseSchoolDate(addDays(today, 7));
  const items: ActionItem[] = [];

  const [pendingReports, overdue, dueWeek, justifications, openAlerts, violenceNoSiseve, citationsUnacked, staleConversations, classroomsWithoutSchedule] = await Promise.all([
    prisma.paymentReport.count({ where: { schoolId, status: 'PENDING' } }),
    prisma.paymentObligation.findMany({
      where: { schoolId, status: { in: ['PENDING', 'PARTIAL'] }, dueDate: { lt: todayDate }, enrollment: { isActive: true } },
      select: { amountDue: true, enrollmentId: true, transactions: { where: { status: 'ACTIVE' }, select: { amountPaid: true } } },
    }),
    prisma.paymentObligation.findMany({
      where: { schoolId, status: { in: ['PENDING', 'PARTIAL'] }, dueDate: { gte: todayDate, lte: weekAhead }, enrollment: { isActive: true } },
      select: { amountDue: true, transactions: { where: { status: 'ACTIVE' }, select: { amountPaid: true } } },
    }),
    prisma.attendanceJustification.count({ where: { schoolId, status: 'PENDING' } }),
    prisma.attendanceAlert.count({ where: { schoolId, status: 'OPEN' } }),
    isAdmin ? prisma.studentIncident.count({ where: { schoolId, isViolenceCase: true, siseveCode: null } }) : Promise.resolve(0),
    isAdmin ? prisma.studentIncident.count({ where: { schoolId, type: 'CITACION_PADRES', acknowledgedAt: null, createdAt: { gte: new Date(Date.now() - 30 * DAY) } } }) : Promise.resolve(0),
    isAdmin
      ? prisma.conversation.findMany({
          where: { schoolId, lastMessageAt: { lt: new Date(Date.now() - 2 * DAY), gt: new Date(Date.now() - 30 * DAY) } },
          select: { lastMessageAt: true, staffLastReadAt: true, parentLastReadAt: true, messages: { orderBy: { createdAt: 'desc' }, take: 1, select: { senderId: true } }, parentId: true },
        })
      : Promise.resolve([]),
    isAdmin && year
      ? prisma.classroom.count({
          where: { schoolId, enrollments: { some: { academicYearId: year.id, isActive: true } }, scheduleBlocks: { none: { academicYearId: year.id } } },
        })
      : Promise.resolve(0),
  ]);

  if (pendingReports) items.push({ id: 'payment-reports', severity: 'high', title: 'Pagos reportados por validar', detail: 'Las familias esperan su recibo.', count: pendingReports, link: '/payments' });
  if (overdue.length) {
    const amount = overdue.reduce((s, o) => s + remainingBalance(o.amountDue, o.transactions), 0);
    const families = new Set(overdue.map((o) => o.enrollmentId)).size;
    if (amount > 0) items.push({ id: 'overdue', severity: 'medium', title: `${money(amount)} en pensiones vencidas`, detail: `${families} estudiante(s) con deuda vencida. Los avisos automáticos ya se envían.`, count: families, link: '/payments' });
  }
  if (dueWeek.length) {
    const amount = dueWeek.reduce((s, o) => s + remainingBalance(o.amountDue, o.transactions), 0);
    if (amount > 0) items.push({ id: 'due-week', severity: 'low', title: `${money(amount)} vence esta semana`, detail: `${dueWeek.length} cuota(s) por vencer en los próximos 7 días.`, count: dueWeek.length, link: '/payments' });
  }
  if (justifications) items.push({ id: 'justifications', severity: 'medium', title: 'Justificaciones de inasistencia por revisar', detail: 'Enviadas por las familias.', count: justifications, link: '/attendance-justifications' });
  if (openAlerts) items.push({ id: 'attendance-alerts', severity: 'high', title: 'Alertas de ausentismo sin atender', detail: 'Faltas seguidas o porcentaje alto de inasistencias.', count: openAlerts, link: '/attendance-alerts' });
  if (violenceNoSiseve) items.push({ id: 'siseve', severity: 'high', title: 'Casos de violencia sin código SíseVe', detail: 'La Ley 29719 obliga a reportarlos en el portal SíseVe.', count: violenceNoSiseve, link: '/incidents' });
  if (citationsUnacked) items.push({ id: 'citations', severity: 'medium', title: 'Citaciones sin confirmar por la familia', detail: 'En los últimos 30 días.', count: citationsUnacked, link: '/incidents' });
  const unanswered = staleConversations.filter((c) => c.messages[0]?.senderId === c.parentId).length;
  if (unanswered) items.push({ id: 'messages', severity: 'medium', title: 'Mensajes de familias sin responder hace más de 2 días', detail: 'El último mensaje de la conversación es de la familia.', count: unanswered, link: '/messages' });
  if (classroomsWithoutSchedule) items.push({ id: 'schedule', severity: 'low', title: 'Aulas sin horario de clases', detail: 'Puedes armarlas en un clic con el armado automático.', count: classroomsWithoutSchedule, link: '/schedule' });

  if (isAdmin && year) {
    const fullYear = await requireYear(schoolId);
    const p = currentPeriod(fullYear);
    const range = getPeriodDateRange(fullYear, p);
    const daysLeft = Math.ceil((range.endDate.getTime() - Date.now()) / DAY);
    const assignments = await prisma.courseAssignment.findMany({
      where: { schoolId, academicYearId: year.id, deletedAt: null, area: { isTransversal: false }, teacher: { isActive: true } },
      select: { id: true, teacherId: true },
    });
    const withGrades = await prisma.detailedGrade.groupBy({ by: ['courseAssignmentId'], where: { schoolId, periodNumber: p, courseAssignmentId: { in: assignments.map((a) => a.id) } } });
    const graded = new Set(withGrades.map((g) => g.courseAssignmentId));
    const missing = assignments.filter((a) => !graded.has(a.id));
    const teachers = new Set(missing.map((m) => m.teacherId)).size;
    if (missing.length && daysLeft <= 21 && daysLeft >= 0) {
      items.push({
        id: 'grades',
        severity: daysLeft <= 7 ? 'high' : 'medium',
        title: `${teachers} docente(s) sin notas del ${periodName(fullYear, p)}`,
        detail: `${missing.length} curso(s) sin calificativos · el periodo cierra en ${daysLeft} día(s).`,
        count: teachers,
        link: '/academic/progress',
      });
    }
    const siagie = await studentsWithSiagieIssues(schoolId, year.id);
    if (siagie.length) items.push({ id: 'siagie', severity: 'low', title: 'Estudiantes con datos incompletos para el SIAGIE', detail: 'Código SIAGIE, DNI, ubigeo o apellidos.', count: siagie.length, link: '/insights?tab=siagie' });
    const risk = await riskForSchool(schoolId, null);
    const high = risk.filter((r) => r.level === 'ALTO').length;
    if (high) items.push({ id: 'risk', severity: 'high', title: 'Estudiantes en riesgo académico alto', detail: 'Combinan notas en C, faltas, tareas sin entregar o incidencias.', count: high, link: '/insights?tab=risk' });
  }

  const order: Record<Severity, number> = { high: 0, medium: 1, low: 2 };
  items.sort((a, b) => order[a.severity] - order[b.severity] || b.count - a.count);
  res.status(200).json({ status: 'success', data: items });
});

// ------------------------------------------------------------------ Riesgo académico

async function riskForSchool(schoolId: string, classroomIds: string[] | null) {
  const year = await requireYear(schoolId);
  const p = currentPeriod(year);
  const since = new Date(Date.now() - 30 * DAY);
  const sinceDate = parseSchoolDate(addDays(getSchoolNow().dateStr, -30));

  const enrollments = await prisma.enrollment.findMany({
    where: { schoolId, academicYearId: year.id, isActive: true, enrollmentState: 'REGISTERED', ...(classroomIds ? { classroomId: { in: classroomIds } } : {}) },
    select: {
      id: true,
      classroomId: true,
      classroom: { select: { grade: true, section: true, educationLevel: true } },
      student: { select: { id: true, firstNames: true, lastNamePaternal: true, lastNameMaternal: true } },
      attendances: { where: { date: { gte: sinceDate } }, select: { status: true } },
      competencePeriodResults: { where: { periodNumber: { in: [p, p - 1] } }, select: { periodNumber: true, courseAssignmentId: true, competenceId: true, finalLetter: true, suggestedLetter: true } },
      incidents: { where: { createdAt: { gte: since }, type: { in: ['DEMERITO', 'CITACION_PADRES'] } }, select: { id: true } },
      homeworkSubmissions: { select: { courseContentId: true } },
      tutoringInterventions: { orderBy: { date: 'desc' }, take: 1, select: { date: true, type: true, status: true } },
    },
  });
  const homeworks = await prisma.courseContent.findMany({
    where: { schoolId, contentType: 'HOMEWORK', dueDate: { gte: since, lt: new Date() }, courseAssignment: { academicYearId: year.id, deletedAt: null } },
    select: { id: true, courseAssignment: { select: { classroomId: true } } },
  });
  const hwByClassroom = new Map<string, string[]>();
  for (const h of homeworks) hwByClassroom.set(h.courseAssignment.classroomId, [...(hwByClassroom.get(h.courseAssignment.classroomId) ?? []), h.id]);

  return enrollments
    .map((e) => {
      const letterOf = (r: { finalLetter: string | null; suggestedLetter: string | null }) => r.finalLetter ?? r.suggestedLetter ?? '';
      const cur = new Map(e.competencePeriodResults.filter((r) => r.periodNumber === p).map((r) => [`${r.courseAssignmentId}|${r.competenceId}`, letterOf(r)]));
      const prev = new Map(e.competencePeriodResults.filter((r) => r.periodNumber === p - 1).map((r) => [`${r.courseAssignmentId}|${r.competenceId}`, letterOf(r)]));
      const submitted = new Set(e.homeworkSubmissions.map((s) => s.courseContentId));
      const risk = computeRisk({
        unjustifiedAbsences30: e.attendances.filter((a) => a.status === 'ABSENT_UNJUSTIFIED').length,
        lates30: e.attendances.filter((a) => a.status === 'LATE_UNJUSTIFIED').length,
        competencesInC: [...cur.values()].filter((l) => l === 'C').length,
        competencesDropped: countDrops(prev, cur),
        missingHomework30: (hwByClassroom.get(e.classroomId) ?? []).filter((id) => !submitted.has(id)).length,
        negativeIncidents30: e.incidents.length,
      });
      const last = e.tutoringInterventions[0];
      return {
        enrollmentId: e.id,
        studentId: e.student.id,
        name: fullName(e.student),
        classroomId: e.classroomId,
        classroom: classroomLabel(e.classroom),
        ...risk,
        lastIntervention: last ? { date: last.date, type: last.type, status: last.status } : null,
      };
    })
    .filter((r) => r.level !== 'NINGUNO')
    .sort((a, b) => b.score - a.score);
}

insightsRouter.get('/risk', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER'), async (req: Request, res: Response) => {
  const { classroomId } = z.object({ classroomId: z.string().uuid().optional() }).parse(req.query);
  const visible = await visibleClassroomIds(req);
  let ids = visible;
  if (classroomId) {
    if (visible && !visible.includes(classroomId)) throw new AppError('Solo puedes ver tus aulas de tutoría.', 403);
    ids = [classroomId];
  }
  const year = await requireYear(req.user!.schoolId);
  const rows = await riskForSchool(req.user!.schoolId, ids);
  res.status(200).json({ status: 'success', data: { periodLabel: periodName(year, currentPeriod(year)), rows } });
});

// ------------------------------------------------------------------ Plan de tutoría

const INTERVENTION_TYPES = ['ENTREVISTA_ESTUDIANTE', 'ENTREVISTA_FAMILIA', 'DERIVACION', 'COMPROMISO', 'SEGUIMIENTO', 'OTRO'] as const;

async function assertEnrollmentAccess(req: Request, enrollmentId: string) {
  const enrollment = await prisma.enrollment.findFirst({ where: { id: enrollmentId, schoolId: req.user!.schoolId }, select: { id: true, classroomId: true } });
  if (!enrollment) throw new AppError('Matrícula no encontrada.', 404);
  const visible = await visibleClassroomIds(req);
  if (visible && !visible.includes(enrollment.classroomId)) throw new AppError('Solo el tutor del aula o la Dirección pueden ver el plan de tutoría.', 403);
  return enrollment;
}

insightsRouter.get('/tutoring/:enrollmentId', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER'), async (req: Request, res: Response) => {
  const { enrollmentId } = z.object({ enrollmentId: z.string().uuid() }).parse(req.params);
  await assertEnrollmentAccess(req, enrollmentId);
  const rows = await prisma.tutoringIntervention.findMany({
    where: { schoolId: req.user!.schoolId, enrollmentId },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    include: { author: { select: { firstName: true, lastNamePaternal: true } } },
  });
  res.status(200).json({
    status: 'success',
    data: rows.map((r) => ({ ...r, authorName: `${r.author.firstName} ${r.author.lastNamePaternal}`, author: undefined })),
  });
});

const interventionSchema = z.object({
  type: z.enum(INTERVENTION_TYPES),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().trim().min(5, 'Describe brevemente la intervención.').max(4000),
  agreements: z.string().trim().max(2000).nullable().optional(),
  followUpDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

insightsRouter.post('/tutoring/:enrollmentId', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER'), async (req: Request, res: Response) => {
  const { enrollmentId } = z.object({ enrollmentId: z.string().uuid() }).parse(req.params);
  const dto = interventionSchema.parse(req.body);
  await assertEnrollmentAccess(req, enrollmentId);
  if (dto.date > getSchoolNow().dateStr) throw new AppError('La fecha de la intervención no puede ser futura.', 400);
  const row = await prisma.tutoringIntervention.create({
    data: {
      schoolId: req.user!.schoolId,
      enrollmentId,
      authorId: req.user!.userId,
      type: dto.type,
      date: parseSchoolDate(dto.date),
      notes: dto.notes,
      agreements: dto.agreements || null,
      followUpDate: dto.followUpDate ? parseSchoolDate(dto.followUpDate) : null,
    },
  });
  // En la bitácora solo el tipo: el contenido es reservado
  recordAudit(req, { action: 'TUTORING_INTERVENTION_CREATED', entity: 'TutoringIntervention', entityId: row.id, after: { tipo: dto.type } });
  res.status(201).json({ status: 'success', data: row });
});

insightsRouter.patch('/tutoring/item/:id', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER'), async (req: Request, res: Response) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
  const { status } = z.object({ status: z.enum(['OPEN', 'CLOSED']) }).parse(req.body);
  const row = await prisma.tutoringIntervention.findFirst({ where: { id, schoolId: req.user!.schoolId } });
  if (!row) throw new AppError('Intervención no encontrada.', 404);
  await assertEnrollmentAccess(req, row.enrollmentId);
  const updated = await prisma.tutoringIntervention.update({ where: { id }, data: { status } });
  res.status(200).json({ status: 'success', data: updated });
});

// ------------------------------------------------------------------ Mapa de calor

insightsRouter.get('/heatmap', authorizeRoles(...ADMINS), async (req: Request, res: Response) => {
  const q = z.object({ periodNumber: z.coerce.number().int().min(1).max(4).optional(), level: z.enum(['INITIAL', 'PRIMARY', 'SECONDARY']).optional() }).parse(req.query);
  const schoolId = req.user!.schoolId;
  const year = await requireYear(schoolId);
  const p = q.periodNumber && q.periodNumber <= periodCount(year) ? q.periodNumber : currentPeriod(year);

  const results = await prisma.competencePeriodResult.findMany({
    where: {
      schoolId,
      periodNumber: p,
      assignment: { academicYearId: year.id, deletedAt: null, area: { isTransversal: false }, ...(q.level ? { classroom: { educationLevel: q.level as EducationLevel } } : {}) },
      enrollment: { isActive: true },
    },
    select: {
      finalLetter: true,
      suggestedLetter: true,
      assignment: { select: { classroomId: true, area: { select: { name: true } }, classroom: { select: { grade: true, section: true, educationLevel: true } } } },
    },
  });
  const cells: Record<string, LetterTally> = {};
  const classrooms = new Map<string, { id: string; label: string; sort: string }>();
  const areas = new Set<string>();
  for (const r of results) {
    const c = r.assignment.classroom;
    const key = `${r.assignment.classroomId}|${r.assignment.area.name}`;
    cells[key] ??= emptyTally();
    addLetter(cells[key], r.finalLetter ?? r.suggestedLetter);
    classrooms.set(r.assignment.classroomId, { id: r.assignment.classroomId, label: classroomLabel(c), sort: `${c.educationLevel}${String(c.grade).padStart(2, '0')}${c.section}` });
    areas.add(r.assignment.area.name);
  }
  const svc = new PeriodService();
  const closed = await svc.getEffectiveStatus(year.id, p, '00000000-0000-0000-0000-000000000000').catch(() => 'OPEN');
  res.status(200).json({
    status: 'success',
    data: {
      periodNumber: p,
      periodLabel: periodName(year, p),
      periods: Array.from({ length: periodCount(year) }, (_, i) => ({ number: i + 1, label: periodName(year, i + 1) })),
      provisional: closed !== 'CLOSED',
      classrooms: [...classrooms.values()].sort((a, b) => a.sort.localeCompare(b.sort)).map(({ id, label }) => ({ id, label })),
      areas: [...areas].sort((a, b) => a.localeCompare(b)),
      cells,
    },
  });
});

// ------------------------------------------------------------------ Datos para el SIAGIE

async function studentsWithSiagieIssues(schoolId: string, academicYearId: string, classroomId?: string) {
  const where: Prisma.EnrollmentWhereInput = { schoolId, academicYearId, isActive: true, ...(classroomId ? { classroomId } : {}) };
  const enrollments = await prisma.enrollment.findMany({
    where,
    select: {
      classroom: { select: { grade: true, section: true, educationLevel: true } },
      student: { select: { id: true, firstNames: true, lastNamePaternal: true, lastNameMaternal: true, documentType: true, documentId: true, studentCode: true, birthUbigeo: true } },
    },
  });
  return enrollments
    .map((e) => ({ studentId: e.student.id, name: fullName(e.student), classroom: classroomLabel(e.classroom), issues: siagieIssues(e.student) }))
    .filter((r) => r.issues.length > 0)
    .sort((a, b) => a.classroom.localeCompare(b.classroom) || a.name.localeCompare(b.name));
}

insightsRouter.get('/siagie-data', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE'), async (req: Request, res: Response) => {
  const { classroomId } = z.object({ classroomId: z.string().uuid().optional() }).parse(req.query);
  const year = await requireYear(req.user!.schoolId);
  const rows = await studentsWithSiagieIssues(req.user!.schoolId, year.id, classroomId);
  const totals: Record<string, number> = {};
  for (const r of rows) for (const i of r.issues) totals[i] = (totals[i] ?? 0) + 1;
  res.status(200).json({ status: 'success', data: { rows, totals } });
});
