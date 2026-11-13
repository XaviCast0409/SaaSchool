import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { authMiddleware, authorizeRoles } from '../../core/middlewares/auth.middleware';
import { tenantMiddleware } from '../../core/middlewares/tenant.middleware';
import { formatLimaDateTime, getSchoolNow, parseSchoolDate } from '../../utils/timezone.util';
import { periodCount, periodName } from '../academic/academic.context';
import { PeriodService } from '../academic/period.service';
import { classroomLabel, studentShortName } from '../automations/recipients';
import { addDays, limaDayRange } from '../automations/automation.rules';
import { remainingBalance } from '../payments/payment.rules';
import { assertStudentAccess, currentEnrollment, viewerStudentIds, type Viewer } from '../schedule/schedule.access';
import { attendanceLight, computeBadges, gradesLight, homeworkLight, paymentsLight } from './family.rules';

/** Portal de la familia: semáforo e insignias por hijo, línea de tiempo y registro de portería. */
export const familyRouter = Router();
familyRouter.use(authMiddleware, tenantMiddleware);

const viewerOf = (req: Request): Viewer => ({
  userId: req.user!.userId,
  role: req.user!.role,
  schoolId: req.user!.schoolId,
  studentId: req.user!.studentId,
});
const DAY = 86_400_000;
const money = (n: number) => `S/ ${n.toFixed(2)}`;

/** Último periodo cerrado del aula y sus calificativos publicados. */
async function publishedLetters(enrollment: { id: string; classroomId: string; academicYearId: string }) {
  const year = await prisma.academicYear.findUnique({ where: { id: enrollment.academicYearId }, select: { periodType: true, periodsConfig: true } });
  if (!year) return { letters: [] as string[], label: null as string | null };
  const svc = new PeriodService();
  for (let p = periodCount(year); p >= 1; p--) {
    if ((await svc.getEffectiveStatus(enrollment.academicYearId, p, enrollment.classroomId)) === 'CLOSED') {
      const results = await prisma.competencePeriodResult.findMany({ where: { enrollmentId: enrollment.id, periodNumber: p }, select: { finalLetter: true } });
      return { letters: results.map((r) => r.finalLetter ?? '').filter(Boolean), label: periodName(year, p) };
    }
  }
  return { letters: [], label: null };
}

async function childOverview(viewer: Viewer, studentId: string) {
  const enrollment = await currentEnrollment(viewer.schoolId, studentId);
  const student = await prisma.student.findUnique({ where: { id: studentId }, select: { id: true, firstNames: true, lastNamePaternal: true } });
  if (!enrollment || !student) return null;
  const now = new Date();
  const today = getSchoolNow().dateStr;
  const monthStart = `${today.slice(0, 7)}-01`;

  const [attendance, homeworks, obligations, grades] = await Promise.all([
    prisma.attendance.findMany({
      where: { enrollmentId: enrollment.id, date: { gte: parseSchoolDate(addDays(today, -45)), lte: parseSchoolDate(today) } },
      orderBy: { date: 'asc' },
      select: { date: true, status: true },
    }),
    prisma.courseContent.findMany({
      where: {
        schoolId: viewer.schoolId,
        contentType: 'HOMEWORK',
        dueDate: { gte: new Date(now.getTime() - 30 * DAY), lt: new Date(now.getTime() + 7 * DAY) },
        courseAssignment: { classroomId: enrollment.classroomId, academicYearId: enrollment.academicYearId, deletedAt: null },
      },
      select: { dueDate: true, submissions: { where: { enrollmentId: enrollment.id }, select: { isLate: true } } },
    }),
    prisma.paymentObligation.findMany({
      where: { enrollmentId: enrollment.id, status: { in: ['PENDING', 'PARTIAL'] } },
      select: { dueDate: true, amountDue: true, transactions: { where: { status: 'ACTIVE' }, select: { amountPaid: true } } },
    }),
    publishedLetters(enrollment),
  ]);

  const last30 = attendance.filter((a) => a.date >= parseSchoolDate(addDays(today, -30))).map((a) => a.status);
  const past = homeworks.filter((h) => h.dueDate! < now);
  const overdueMissing = past.filter((h) => h.submissions.length === 0).length;
  const dueSoon = homeworks.filter((h) => h.dueDate! >= now && h.submissions.length === 0).length;
  const todayDate = parseSchoolDate(today);
  const soonDate = parseSchoolDate(addDays(today, 7));
  const overdueAmount = obligations.filter((o) => o.dueDate < todayDate).reduce((s, o) => s + remainingBalance(o.amountDue, o.transactions), 0);
  const dueSoonAmount = obligations.filter((o) => o.dueDate >= todayDate && o.dueDate <= soonDate).reduce((s, o) => s + remainingBalance(o.amountDue, o.transactions), 0);

  const lights = [
    attendanceLight(last30),
    gradesLight(grades.letters, grades.label),
    homeworkLight(overdueMissing, dueSoon),
    // Los pagos solo se muestran al apoderado, nunca al alumno
    ...(viewer.role === 'PARENT' ? [paymentsLight(overdueAmount, dueSoonAmount)] : []),
  ];
  const badges = computeBadges({
    monthStatuses: attendance.filter((a) => a.date >= parseSchoolDate(monthStart)).map((a) => a.status),
    recentStatuses: attendance.map((a) => a.status),
    homeworkDue30: past.length,
    homeworkOnTime30: past.filter((h) => h.submissions.length > 0 && !h.submissions[0].isLate).length,
  });
  return {
    studentId,
    name: studentShortName(student),
    classroom: classroomLabel(enrollment.classroom),
    lights,
    badges,
  };
}

/** Semáforo e insignias de cada hijo (o del propio alumno). */
familyRouter.get('/overview', authorizeRoles('PARENT', 'STUDENT'), async (req: Request, res: Response) => {
  const viewer = viewerOf(req);
  const ids = await viewerStudentIds(viewer);
  const data = (await Promise.all(ids.map((id) => childOverview(viewer, id)))).filter(Boolean);
  res.status(200).json({ status: 'success', data });
});

type Tone = 'info' | 'success' | 'warning' | 'danger';
interface TimelineItem {
  id: string;
  at: string;
  kind: string;
  title: string;
  detail?: string;
  link?: string;
  tone: Tone;
}

/** Línea de tiempo del hijo: lo que pasó en los últimos días y lo que viene. */
familyRouter.get('/timeline', authorizeRoles('PARENT', 'STUDENT'), async (req: Request, res: Response) => {
  const q = z.object({ studentId: z.string().uuid(), days: z.coerce.number().int().min(3).max(60).default(14) }).parse(req.query);
  const viewer = viewerOf(req);
  await assertStudentAccess(viewer, q.studentId);
  const enrollment = await currentEnrollment(viewer.schoolId, q.studentId);
  if (!enrollment) {
    res.status(200).json({ status: 'success', data: { past: [], upcoming: [] } });
    return;
  }
  const now = new Date();
  const today = getSchoolNow().dateStr;
  const from = limaDayRange(addDays(today, -q.days)).gte;
  const until = new Date(now.getTime() + 7 * DAY);
  const isParent = viewer.role === 'PARENT';
  const items: TimelineItem[] = [];

  const [attendance, contents, graded, announcements, incidents, transactions, obligations, periods, meetings] = await Promise.all([
    prisma.attendance.findMany({
      where: { enrollmentId: enrollment.id, date: { gte: parseSchoolDate(addDays(today, -q.days)) } },
      select: { id: true, date: true, status: true, checkInTime: true, checkOutTime: true, pickedUpByName: true },
    }),
    prisma.courseContent.findMany({
      where: {
        schoolId: viewer.schoolId,
        publishedAt: { gte: from },
        contentType: { in: ['HOMEWORK', 'LESSON_MATERIAL'] },
        courseAssignment: { classroomId: enrollment.classroomId, academicYearId: enrollment.academicYearId, deletedAt: null },
      },
      select: { id: true, title: true, contentType: true, publishedAt: true, dueDate: true, courseAssignment: { select: { area: { select: { name: true } } } } },
    }),
    prisma.homeworkSubmission.findMany({
      where: { enrollmentId: enrollment.id, gradedAt: { gte: from } },
      select: { id: true, gradedAt: true, literalScore: true, numericScore: true, courseContent: { select: { title: true } } },
    }),
    prisma.announcement.findMany({
      where: { schoolId: viewer.schoolId, isActive: true, targetRoles: { has: 'PARENT' }, publishedAt: { gte: from }, OR: [{ classroomId: null }, { classroomId: enrollment.classroomId }] },
      select: { id: true, title: true, publishedAt: true, priority: true, responseType: true },
    }),
    prisma.studentIncident.findMany({ where: { enrollmentId: enrollment.id, createdAt: { gte: from } }, select: { id: true, type: true, title: true, createdAt: true } }),
    isParent
      ? prisma.paymentTransaction.findMany({
          where: { obligation: { enrollmentId: enrollment.id }, status: 'ACTIVE', paymentDate: { gte: from } },
          select: { id: true, paymentDate: true, amountPaid: true, receiptNumber: true, obligation: { select: { title: true } } },
        })
      : Promise.resolve([]),
    isParent
      ? prisma.paymentObligation.findMany({
          where: { enrollmentId: enrollment.id, status: { in: ['PENDING', 'PARTIAL'] }, dueDate: { gte: parseSchoolDate(addDays(today, -q.days)), lte: parseSchoolDate(addDays(today, 7)) } },
          select: { id: true, title: true, dueDate: true, amountDue: true, transactions: { where: { status: 'ACTIVE' }, select: { amountPaid: true } } },
        })
      : Promise.resolve([]),
    prisma.academicPeriodStatus.findMany({
      where: { academicYearId: enrollment.academicYearId, status: 'CLOSED', changedAt: { gte: from }, OR: [{ classroomId: null }, { classroomId: enrollment.classroomId }] },
      select: { id: true, periodNumber: true, changedAt: true },
    }),
    isParent
      ? prisma.meetingSlot.findMany({
          where: { schoolId: viewer.schoolId, bookedByParentId: viewer.userId, studentId: q.studentId, status: 'BOOKED', startsAt: { gte: from, lt: until } },
          select: { id: true, startsAt: true, location: true, staff: { select: { firstName: true, lastNamePaternal: true } } },
        })
      : Promise.resolve([]),
  ]);

  const time = (d: Date) => formatLimaDateTime(d, { hour: '2-digit', minute: '2-digit' });
  for (const a of attendance) {
    if (a.checkInTime) {
      const late = a.status.startsWith('LATE');
      items.push({ id: `in-${a.id}`, at: a.checkInTime.toISOString(), kind: 'ATTENDANCE', title: late ? `Llegó tarde (${time(a.checkInTime)})` : `Entró al colegio (${time(a.checkInTime)})`, tone: late ? 'warning' : 'success', link: '/attendance' });
    }
    if (a.checkOutTime) {
      items.push({ id: `out-${a.id}`, at: a.checkOutTime.toISOString(), kind: 'ATTENDANCE', title: `Salió del colegio (${time(a.checkOutTime)})`, detail: a.pickedUpByName ? `Recogido(a) por ${a.pickedUpByName}` : undefined, tone: 'info', link: '/attendance' });
    }
    if (a.status === 'ABSENT_UNJUSTIFIED' || a.status === 'ABSENT_JUSTIFIED') {
      items.push({
        id: `abs-${a.id}`,
        at: new Date(`${a.date.toISOString().slice(0, 10)}T13:00:00.000Z`).toISOString(),
        kind: 'ATTENDANCE',
        title: a.status === 'ABSENT_JUSTIFIED' ? 'Falta justificada' : 'No asistió al colegio',
        detail: a.status === 'ABSENT_UNJUSTIFIED' && isParent ? 'Puedes enviar una justificación desde Asistencia.' : undefined,
        tone: a.status === 'ABSENT_JUSTIFIED' ? 'info' : 'danger',
        link: '/attendance',
      });
    }
  }
  for (const c of contents) {
    const area = c.courseAssignment.area.name;
    items.push({
      id: `content-${c.id}`,
      at: c.publishedAt.toISOString(),
      kind: c.contentType === 'HOMEWORK' ? 'HOMEWORK' : 'MATERIAL',
      title: c.contentType === 'HOMEWORK' ? `Nueva tarea de ${area}` : `Nuevo material de ${area}`,
      detail: c.contentType === 'HOMEWORK' && c.dueDate ? `${c.title} · vence ${formatLimaDateTime(c.dueDate, { weekday: 'long', day: 'numeric', month: 'short' })}` : c.title,
      tone: 'info',
      link: '/virtual-classroom',
    });
  }
  for (const g of graded) {
    const score = g.literalScore ?? (g.numericScore !== null ? String(g.numericScore) : null);
    items.push({ id: `graded-${g.id}`, at: g.gradedAt!.toISOString(), kind: 'GRADE', title: 'Tarea calificada', detail: `${g.courseContent.title}${score ? ` · ${score}` : ''}`, tone: score === 'C' ? 'warning' : 'success', link: '/virtual-classroom' });
  }
  for (const a of announcements) {
    const needs = a.responseType && a.responseType !== 'NONE';
    items.push({ id: `ann-${a.id}`, at: a.publishedAt.toISOString(), kind: 'ANNOUNCEMENT', title: needs ? 'Comunicado que requiere respuesta' : 'Nuevo comunicado', detail: a.title, tone: a.priority === 'URGENT' || needs ? 'warning' : 'info', link: '/announcements' });
  }
  const INCIDENT: Record<string, { title: string; tone: Tone }> = {
    MERITO: { title: 'Reconocimiento', tone: 'success' },
    DEMERITO: { title: 'Observación de conducta', tone: 'warning' },
    ATENCION_TOPICO: { title: 'Atención en tópico', tone: 'info' },
    CITACION_PADRES: { title: 'Citación a la familia', tone: 'danger' },
  };
  for (const i of incidents) {
    const meta = INCIDENT[i.type] ?? { title: 'Incidencia', tone: 'info' as Tone };
    items.push({ id: `inc-${i.id}`, at: i.createdAt.toISOString(), kind: 'INCIDENT', title: meta.title, detail: i.title, tone: meta.tone, link: '/dashboard' });
  }
  for (const t of transactions) {
    items.push({ id: `tx-${t.id}`, at: t.paymentDate.toISOString(), kind: 'PAYMENT', title: `Pago registrado: ${money(Number(t.amountPaid))}`, detail: `${t.obligation.title}${t.receiptNumber ? ` · Recibo ${t.receiptNumber}` : ''}`, tone: 'success', link: '/payments' });
  }
  for (const o of obligations) {
    const overdue = o.dueDate.toISOString().slice(0, 10) < today;
    items.push({
      id: `due-${o.id}`,
      at: new Date(`${o.dueDate.toISOString().slice(0, 10)}T13:00:00.000Z`).toISOString(),
      kind: 'PAYMENT',
      title: overdue ? `Pensión vencida: ${o.title}` : `Vence: ${o.title}`,
      detail: `Saldo ${money(remainingBalance(o.amountDue, o.transactions))} · puedes reportar tu pago con Yape o Plin`,
      tone: overdue ? 'danger' : 'warning',
      link: '/payments',
    });
  }
  const year = await prisma.academicYear.findUnique({ where: { id: enrollment.academicYearId }, select: { periodType: true, periodsConfig: true } });
  for (const p of periods) {
    items.push({ id: `period-${p.id}`, at: p.changedAt.toISOString(), kind: 'GRADE', title: `Notas del ${year ? periodName(year, p.periodNumber) : `periodo ${p.periodNumber}`} publicadas`, detail: 'La libreta ya está disponible.', tone: 'success', link: '/grades' });
  }
  for (const m of meetings) {
    items.push({ id: `meet-${m.id}`, at: m.startsAt.toISOString(), kind: 'MEETING', title: `Entrevista con ${m.staff.firstName} ${m.staff.lastNamePaternal}`, detail: m.location ?? undefined, tone: 'info', link: '/meetings' });
  }

  const nowIso = now.toISOString();
  const upcoming = items.filter((i) => i.at > nowIso).sort((a, b) => a.at.localeCompare(b.at));
  const past = items.filter((i) => i.at <= nowIso).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 80);
  res.status(200).json({ status: 'success', data: { past, upcoming } });
});

/** Portería: salidas registradas hoy (quién recogió a quién y a qué hora). */
familyRouter.get('/gate/today', authorizeRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER'), async (req: Request, res: Response) => {
  const today = getSchoolNow().dateObj;
  const rows = await prisma.attendance.findMany({
    where: { schoolId: req.user!.schoolId, date: today, checkOutTime: { not: null } },
    orderBy: { checkOutTime: 'desc' },
    take: 300,
    select: {
      id: true,
      checkOutTime: true,
      pickedUpByName: true,
      pickedUpByDocument: true,
      earlyLeaveReason: true,
      enrollment: {
        select: {
          student: { select: { firstNames: true, lastNamePaternal: true, lastNameMaternal: true } },
          classroom: { select: { grade: true, section: true, educationLevel: true } },
        },
      },
    },
  });
  const present = await prisma.attendance.count({
    where: { schoolId: req.user!.schoolId, date: today, status: { in: ['PRESENT', 'LATE_JUSTIFIED', 'LATE_UNJUSTIFIED'] } },
  });
  res.status(200).json({
    status: 'success',
    data: {
      present,
      checkedOut: rows.length,
      rows: rows.map((r) => ({
        id: r.id,
        checkOutTime: r.checkOutTime,
        student: `${r.enrollment.student.firstNames} ${r.enrollment.student.lastNamePaternal} ${r.enrollment.student.lastNameMaternal ?? ''}`.trim(),
        classroom: classroomLabel(r.enrollment.classroom),
        pickedUpByName: r.pickedUpByName,
        pickedUpByDocument: r.pickedUpByDocument,
        earlyLeaveReason: r.earlyLeaveReason,
      })),
    },
  });
});
