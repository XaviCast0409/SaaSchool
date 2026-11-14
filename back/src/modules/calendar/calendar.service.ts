import crypto from 'crypto';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { getPeriodDateRange } from '../../utils/period-dates.util';
import { periodCount, periodName } from '../academic/academic.context';
import { env } from '../../config/env';
import { parseSchoolDate, getSchoolTimeParts } from '../../utils/timezone.util';
import { remainingBalance } from '../payments/payment.rules';
import { classroomLabel, studentShortName } from '../automations/recipients';
import { activeYear, isStaff, viewerStudentIds, type Viewer } from '../schedule/schedule.access';

export type CalendarKind = 'EVENT' | 'HOLIDAY' | 'HOMEWORK' | 'MEETING' | 'PAYMENT' | 'PERIOD';

export interface CalendarItem {
  id: string;
  kind: CalendarKind;
  title: string;
  date: string;
  endDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  location?: string | null;
  description?: string | null;
  eventType?: string;
  scope?: string;
  studentName?: string;
  link?: string;
  editable?: boolean;
  classroomId?: string | null;
  educationLevel?: string | null;
  visibleToFamilies?: boolean;
}

const dateKey = (d: Date) => d.toISOString().slice(0, 10);
const limaDate = (d: Date) => getSchoolTimeParts(d).dateStr;
const limaTime = (d: Date) => {
  const p = getSchoolTimeParts(d);
  return `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`;
};

/** Aulas y niveles (año activo) de los hijos del apoderado o del alumno. */
async function familyContext(viewer: Viewer) {
  const studentIds = await viewerStudentIds(viewer);
  const year = await activeYear(viewer.schoolId);
  if (!year || studentIds.length === 0) return { year, enrollments: [] as Array<{ id: string; classroomId: string; level: string; student: { id: string; firstNames: string; lastNamePaternal: string } }> };
  const enr = await prisma.enrollment.findMany({
    where: { schoolId: viewer.schoolId, academicYearId: year.id, isActive: true, studentId: { in: studentIds } },
    select: { id: true, classroomId: true, classroom: { select: { educationLevel: true } }, student: { select: { id: true, firstNames: true, lastNamePaternal: true } } },
  });
  return { year, enrollments: enr.map((e) => ({ id: e.id, classroomId: e.classroomId, level: e.classroom.educationLevel, student: e.student })) };
}

/** Calendario combinado de la persona: eventos, feriados, tareas, entrevistas y vencimientos de pago. */
export async function collectCalendar(viewer: Viewer, from: string, to: string): Promise<CalendarItem[]> {
  const fromDate = parseSchoolDate(from);
  const toDate = parseSchoolDate(to);
  const instantFrom = new Date(`${from}T05:00:00.000Z`);
  const instantTo = new Date(new Date(`${to}T05:00:00.000Z`).getTime() + 86_400_000);
  const items: CalendarItem[] = [];
  const family = viewer.role === 'PARENT' || viewer.role === 'STUDENT';
  const ctx = family ? await familyContext(viewer) : null;
  const classroomIds = ctx ? [...new Set(ctx.enrollments.map((e) => e.classroomId))] : [];
  const levels = ctx ? [...new Set(ctx.enrollments.map((e) => e.level))] : [];

  // Eventos del colegio
  const eventWhere: Prisma.SchoolEventWhereInput = {
    schoolId: viewer.schoolId,
    startDate: { lte: toDate },
    OR: [{ endDate: null, startDate: { gte: fromDate } }, { endDate: { gte: fromDate } }],
    ...(family
      ? {
          visibleToFamilies: true,
          AND: [
            { OR: [{ classroomId: null }, { classroomId: { in: classroomIds } }] },
            { OR: [{ educationLevel: null }, { educationLevel: { in: levels as Prisma.EnumEducationLevelFilter['in'] } }] },
          ],
        }
      : {}),
  };
  const events = await prisma.schoolEvent.findMany({
    where: eventWhere,
    include: { classroom: { select: { grade: true, section: true, educationLevel: true } } },
    orderBy: [{ startDate: 'asc' }, { startTime: 'asc' }],
  });
  const canManageAll = ['SCHOOL_ADMIN', 'SUPER_ADMIN', 'ADMINISTRATIVE'].includes(viewer.role);
  for (const e of events) {
    items.push({
      id: e.id,
      kind: 'EVENT',
      title: e.title,
      date: dateKey(e.startDate),
      endDate: e.endDate ? dateKey(e.endDate) : null,
      startTime: e.startTime,
      endTime: e.endTime,
      location: e.location,
      description: e.description,
      eventType: e.type,
      scope: e.classroom ? classroomLabel(e.classroom) : e.educationLevel ? { INITIAL: 'Inicial', PRIMARY: 'Primaria', SECONDARY: 'Secundaria' }[e.educationLevel] : 'Todo el colegio',
      editable: canManageAll || e.createdById === viewer.userId,
      classroomId: e.classroomId,
      educationLevel: e.educationLevel,
      visibleToFamilies: e.visibleToFamilies,
    });
  }

  // Feriados y días no laborables
  const holidays = await prisma.schoolHoliday.findMany({ where: { schoolId: viewer.schoolId, date: { gte: fromDate, lte: toDate } } });
  for (const h of holidays) items.push({ id: h.id, kind: 'HOLIDAY', title: h.name, date: dateKey(h.date) });

  // Inicio y cierre de cada bimestre/trimestre (salen del año lectivo, sin cargarlos a mano)
  const yearForPeriods = await prisma.academicYear.findFirst({
    where: { schoolId: viewer.schoolId, isActive: true },
    select: { id: true, startDate: true, endDate: true, periodType: true, periodsConfig: true },
  });
  if (yearForPeriods) {
    const total = periodCount(yearForPeriods);
    for (let p = 1; p <= total; p++) {
      const range = getPeriodDateRange(yearForPeriods, p);
      const name = periodName(yearForPeriods, p);
      const start = dateKey(range.startDate);
      const end = dateKey(range.endDate);
      if (start >= from && start <= to) items.push({ id: `${yearForPeriods.id}-p${p}-start`, kind: 'PERIOD', title: `Inicio del ${name}`, date: start });
      if (end >= from && end <= to) items.push({ id: `${yearForPeriods.id}-p${p}-end`, kind: 'PERIOD', title: `Cierre del ${name}`, date: end });
    }
  }

  // Tareas con fecha de entrega
  if (family && ctx && ctx.enrollments.length) {
    const homeworks = await prisma.courseContent.findMany({
      where: {
        schoolId: viewer.schoolId,
        contentType: 'HOMEWORK',
        dueDate: { gte: instantFrom, lt: instantTo },
        courseAssignment: { classroomId: { in: classroomIds }, deletedAt: null, academicYearId: ctx.year?.id },
      },
      select: { id: true, title: true, dueDate: true, courseAssignment: { select: { classroomId: true, area: { select: { name: true } } } } },
    });
    for (const h of homeworks) {
      for (const e of ctx.enrollments.filter((x) => x.classroomId === h.courseAssignment.classroomId)) {
        items.push({
          id: `${h.id}:${e.student.id}`,
          kind: 'HOMEWORK',
          title: `${h.courseAssignment.area.name}: ${h.title}`,
          date: limaDate(h.dueDate!),
          startTime: limaTime(h.dueDate!),
          studentName: viewer.role === 'PARENT' ? studentShortName(e.student) : undefined,
          link: '/virtual-classroom',
        });
      }
    }
  } else if (viewer.role === 'TEACHER') {
    const homeworks = await prisma.courseContent.findMany({
      where: { schoolId: viewer.schoolId, contentType: 'HOMEWORK', teacherId: viewer.userId, dueDate: { gte: instantFrom, lt: instantTo } },
      select: { id: true, title: true, dueDate: true, courseAssignment: { select: { area: { select: { name: true } }, classroom: { select: { grade: true, section: true, educationLevel: true } } } } },
    });
    for (const h of homeworks) {
      items.push({
        id: h.id,
        kind: 'HOMEWORK',
        title: `${h.courseAssignment.area.name} (${classroomLabel(h.courseAssignment.classroom)}): ${h.title}`,
        date: limaDate(h.dueDate!),
        startTime: limaTime(h.dueDate!),
        link: '/my-courses',
      });
    }
  }

  // Entrevistas reservadas
  if (viewer.role !== 'STUDENT') {
    const meetings = await prisma.meetingSlot.findMany({
      where: {
        schoolId: viewer.schoolId,
        status: 'BOOKED',
        startsAt: { gte: instantFrom, lt: instantTo },
        ...(viewer.role === 'PARENT' ? { bookedByParentId: viewer.userId } : { staffId: viewer.userId }),
      },
      select: {
        id: true,
        startsAt: true,
        endsAt: true,
        location: true,
        staff: { select: { firstName: true, lastNamePaternal: true } },
        parent: { select: { firstName: true, lastNamePaternal: true } },
        student: { select: { firstNames: true, lastNamePaternal: true } },
      },
    });
    for (const m of meetings) {
      const other = viewer.role === 'PARENT' ? m.staff : m.parent;
      items.push({
        id: m.id,
        kind: 'MEETING',
        title: `Entrevista con ${other ? `${other.firstName} ${other.lastNamePaternal}` : 'familia'}${m.student ? ` (${studentShortName(m.student)})` : ''}`,
        date: limaDate(m.startsAt),
        startTime: limaTime(m.startsAt),
        endTime: limaTime(m.endsAt),
        location: m.location,
        link: '/meetings',
      });
    }
  }

  // Vencimientos de pensiones (solo apoderados)
  if (viewer.role === 'PARENT' && ctx && ctx.enrollments.length) {
    const obligations = await prisma.paymentObligation.findMany({
      where: { schoolId: viewer.schoolId, enrollmentId: { in: ctx.enrollments.map((e) => e.id) }, status: { in: ['PENDING', 'PARTIAL'] }, dueDate: { gte: fromDate, lte: toDate } },
      select: { id: true, title: true, dueDate: true, amountDue: true, enrollmentId: true, transactions: { where: { status: 'ACTIVE' }, select: { amountPaid: true } } },
    });
    for (const o of obligations) {
      const e = ctx.enrollments.find((x) => x.id === o.enrollmentId);
      items.push({
        id: o.id,
        kind: 'PAYMENT',
        title: `Vence: ${o.title} (S/ ${remainingBalance(o.amountDue, o.transactions).toFixed(2)})`,
        date: dateKey(o.dueDate),
        studentName: e ? studentShortName(e.student) : undefined,
        link: '/payments',
      });
    }
  }

  return items.sort((a, b) => a.date.localeCompare(b.date) || (a.startTime ?? '').localeCompare(b.startTime ?? ''));
}

// ------------------------------------------------------------- Suscripción .ics firmada

/** Firma ligada a la contraseña: al cambiarla, los enlaces de suscripción anteriores dejan de funcionar. */
function feedSignature(kind: 'u' | 's', id: string, passwordChangedAt: Date | null): string {
  return crypto
    .createHmac('sha256', env.FILES_SIGNING_SECRET)
    .update(`ics:${kind}:${id}:${passwordChangedAt?.getTime() ?? 0}`)
    .digest('base64url')
    .slice(0, 32);
}

export async function feedToken(viewer: Viewer): Promise<string> {
  if (viewer.role === 'STUDENT' && viewer.studentId) {
    const s = await prisma.student.findUnique({ where: { id: viewer.studentId }, select: { passwordChangedAt: true } });
    return `s.${viewer.studentId}.${feedSignature('s', viewer.studentId, s?.passwordChangedAt ?? null)}`;
  }
  const u = await prisma.user.findUnique({ where: { id: viewer.userId }, select: { passwordChangedAt: true } });
  return `u.${viewer.userId}.${feedSignature('u', viewer.userId, u?.passwordChangedAt ?? null)}`;
}

/** Resuelve un token de suscripción a la persona correspondiente, o null si no es válido. */
export async function viewerFromFeedToken(token: string): Promise<{ viewer: Viewer; schoolName: string } | null> {
  const [kind, id, sig] = token.split('.');
  if ((kind !== 'u' && kind !== 's') || !id || !sig || !/^[0-9a-f-]{36}$/.test(id)) return null;
  if (kind === 's') {
    const s = await prisma.student.findUnique({ where: { id }, select: { id: true, schoolId: true, passwordChangedAt: true, school: { select: { name: true, isActive: true } } } });
    if (!s || !s.school.isActive) return null;
    if (!safeEqual(sig, feedSignature('s', id, s.passwordChangedAt))) return null;
    return { viewer: { userId: id, role: 'STUDENT', schoolId: s.schoolId, studentId: id }, schoolName: s.school.name };
  }
  const u = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true, schoolId: true, isActive: true, passwordChangedAt: true, school: { select: { name: true, isActive: true } } } });
  if (!u || !u.isActive || !u.school.isActive) return null;
  if (!safeEqual(sig, feedSignature('u', id, u.passwordChangedAt))) return null;
  return { viewer: { userId: id, role: u.role, schoolId: u.schoolId }, schoolName: u.school.name };
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

export { isStaff };
