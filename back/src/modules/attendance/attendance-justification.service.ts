import type { AttendanceStatus, Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../core/errors/app-error';
import { getSchoolNow } from '../../utils/timezone.util';
import { notificationService } from '../notifications/notification.routes';
import { daysBetween, expandSchoolDays } from './attendance.rules';
import type { CreateJustificationDto, ReviewJustificationDto, JustificationFilterDto } from './attendance.schema';

interface Principal {
  userId: string;
  studentId?: string;
  role: string;
  schoolId: string;
}

const STAFF = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE'];
const MAX_RANGE_DAYS = 15;
const MAX_PAST_DAYS = 30;
// Hasta 15 días lectivos con varias consultas cada uno: margen sobre los 5 s por defecto de Prisma.
const TX_OPTIONS = { timeout: 15_000 };
const REASON_LABELS: Record<string, string> = {
  MEDICAL: 'Salud / cita médica',
  FAMILY: 'Motivo familiar',
  BEREAVEMENT: 'Duelo',
  TRANSPORT: 'Problema de transporte',
  OTHER: 'Otro motivo',
};
/** Estado al que pasa cada estado injustificado cuando se aprueba la justificación. */
const JUSTIFIED_STATUS: Partial<Record<AttendanceStatus, AttendanceStatus>> = {
  ABSENT_UNJUSTIFIED: 'ABSENT_JUSTIFIED',
  LATE_UNJUSTIFIED: 'LATE_JUSTIFIED',
};

export class AttendanceJustificationService {
  private async getEnrollmentForPrincipal(enrollmentId: string, principal: Principal) {
    const enrollment = await prisma.enrollment.findFirst({
      where: { id: enrollmentId, schoolId: principal.schoolId },
      select: {
        id: true,
        classroom: { select: { tutorTeacherId: true } },
        student: {
          select: { id: true, firstNames: true, lastNamePaternal: true, familyRelations: { select: { userId: true } } },
        },
      },
    });
    if (!enrollment) throw new AppError('Matrícula no encontrada.', 404);

    if (principal.role === 'PARENT') {
      const isGuardian = enrollment.student.familyRelations.some((r) => r.userId === principal.userId);
      if (!isGuardian) throw new AppError('No tienes permisos sobre este estudiante.', 403);
    } else if (principal.role === 'TEACHER') {
      if (enrollment.classroom.tutorTeacherId !== principal.userId) {
        throw new AppError('Solo el tutor del aula puede gestionar estas justificaciones.', 403);
      }
    } else if (!STAFF.includes(principal.role)) {
      throw new AppError('No tienes permisos para esta acción.', 403);
    }
    return enrollment;
  }

  /**
   * Aplica la justificación a los días lectivos del rango, dentro de la transacción recibida:
   * - Asistencia diaria: falta injustificada -> falta justificada, tardanza injustificada -> tardanza
   *   justificada; los días sin registro quedan como falta justificada.
   * - Asistencia por curso: los registros ya tomados de esos días pasan igual al tipo justificado.
   */
  private async applyToAttendance(
    tx: Prisma.TransactionClient,
    schoolId: string,
    enrollmentId: string,
    dateFrom: string,
    dateTo: string,
    justificationId: string,
  ) {
    const holidays = await tx.schoolHoliday.findMany({
      where: {
        schoolId,
        date: { gte: new Date(`${dateFrom}T00:00:00.000Z`), lte: new Date(`${dateTo}T00:00:00.000Z`) },
      },
      select: { date: true },
    });
    const days = expandSchoolDays(dateFrom, dateTo, new Set(holidays.map((h) => h.date.toISOString().slice(0, 10))));
    if (days.length === 0) return;
    const dates = days.map((day) => new Date(`${day}T00:00:00.000Z`));
    const note = `Justificada (solicitud ${justificationId.slice(0, 8)})`;

    for (const date of dates) {
      const existing = await tx.attendance.findUnique({
        where: { enrollmentId_date: { enrollmentId, date } },
        select: { id: true, status: true },
      });
      if (!existing) {
        await tx.attendance.create({
          data: { schoolId, enrollmentId, date, status: 'ABSENT_JUSTIFIED', origin: 'MANUAL', notes: note },
        });
        continue;
      }
      const nextStatus = JUSTIFIED_STATUS[existing.status];
      if (nextStatus) {
        await tx.attendance.update({ where: { id: existing.id }, data: { status: nextStatus, notes: note } });
      }
    }

    for (const [from, to] of Object.entries(JUSTIFIED_STATUS) as [AttendanceStatus, AttendanceStatus][]) {
      await tx.courseAttendanceRecord.updateMany({
        where: { enrollmentId, status: from, session: { schoolId, date: { in: dates } } },
        data: { status: to, note },
      });
    }
  }

  async create(principal: Principal, dto: CreateJustificationDto) {
    const enrollment = await this.getEnrollmentForPrincipal(dto.enrollmentId, principal);
    const today = getSchoolNow().dateStr;

    if (daysBetween(dto.dateFrom, dto.dateTo) + 1 > MAX_RANGE_DAYS) {
      throw new AppError(`El rango máximo por solicitud es de ${MAX_RANGE_DAYS} días.`, 400);
    }
    if (daysBetween(dto.dateFrom, today) > MAX_PAST_DAYS) {
      throw new AppError(`Solo se pueden justificar inasistencias de los últimos ${MAX_PAST_DAYS} días.`, 400);
    }

    const isStaff = STAFF.includes(principal.role) || principal.role === 'TEACHER';
    // La solicitud y su efecto en la asistencia se guardan juntos: o se aplica todo o nada.
    const justification = await prisma.$transaction(async (tx) => {
      const created = await tx.attendanceJustification.create({
        data: {
          schoolId: principal.schoolId,
          enrollmentId: dto.enrollmentId,
          dateFrom: new Date(`${dto.dateFrom}T00:00:00.000Z`),
          dateTo: new Date(`${dto.dateTo}T00:00:00.000Z`),
          reason: dto.reason,
          description: dto.description,
          fileUrl: dto.fileUrl ?? null,
          fileName: dto.fileName ?? null,
          requestedById: principal.userId,
          requestedByRole: principal.role,
          // Registrada por personal del colegio: queda aprobada directamente
          status: isStaff ? 'APPROVED' : 'PENDING',
          reviewedById: isStaff ? principal.userId : null,
          reviewedAt: isStaff ? new Date() : null,
        },
      });
      if (isStaff) {
        await this.applyToAttendance(tx, principal.schoolId, dto.enrollmentId, dto.dateFrom, dto.dateTo, created.id);
      }
      return created;
    }, TX_OPTIONS);

    if (!isStaff) {
      const studentName = `${enrollment.student.firstNames} ${enrollment.student.lastNamePaternal}`;
      const tutorId = enrollment.classroom.tutorTeacherId;
      const reviewers = await prisma.user.findMany({
        where: { schoolId: principal.schoolId, isActive: true, role: { in: ['SCHOOL_ADMIN', 'ADMINISTRATIVE'] } },
        select: { id: true },
      });
      const targets = Array.from(new Set([...(tutorId ? [tutorId] : []), ...reviewers.map((r) => r.id)]));
      for (const userId of targets) {
        await notificationService
          .createNotification(principal.schoolId, {
            userId,
            title: 'Nueva justificación de asistencia',
            message: `Se recibió una justificación para ${studentName} (${REASON_LABELS[dto.reason]}).`,
            type: 'ATTENDANCE',
            link: '/attendance-justifications',
          })
          .catch((error) => console.error('[Justification notify]', error));
      }
    }
    return justification;
  }

  async list(principal: Principal, filters: JustificationFilterDto) {
    const where: Record<string, unknown> = {
      schoolId: principal.schoolId,
      ...(filters.status && { status: filters.status }),
      ...(filters.enrollmentId && { enrollmentId: filters.enrollmentId }),
    };
    if (principal.role === 'PARENT') {
      where.enrollment = { student: { familyRelations: { some: { userId: principal.userId } } } };
    } else if (principal.role === 'TEACHER') {
      where.enrollment = { classroom: { tutorTeacherId: principal.userId } };
    } else if (!STAFF.includes(principal.role)) {
      throw new AppError('No tienes permisos para esta acción.', 403);
    }

    const [data, total] = await Promise.all([
      prisma.attendanceJustification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
        include: {
          enrollment: {
            select: {
              id: true,
              classroom: { select: { grade: true, section: true, educationLevel: true } },
              student: { select: { id: true, firstNames: true, lastNamePaternal: true, lastNameMaternal: true } },
            },
          },
        },
      }),
      prisma.attendanceJustification.count({ where }),
    ]);
    return { data, meta: { total, page: filters.page, limit: filters.limit, totalPages: Math.ceil(total / filters.limit) } };
  }

  async review(principal: Principal, id: string, dto: ReviewJustificationDto) {
    const justification = await prisma.attendanceJustification.findFirst({ where: { id, schoolId: principal.schoolId } });
    if (!justification) throw new AppError('Justificación no encontrada.', 404);
    if (justification.status !== 'PENDING') throw new AppError('Esta justificación ya fue revisada.', 409);

    const enrollment = await this.getEnrollmentForPrincipal(justification.enrollmentId, principal);
    if (principal.role === 'PARENT') throw new AppError('No tienes permisos para revisar justificaciones.', 403);

    const from = justification.dateFrom.toISOString().slice(0, 10);
    const to = justification.dateTo.toISOString().slice(0, 10);
    // Cambio de estado y actualización de asistencia en una sola transacción. El filtro por PENDING
    // evita que dos revisiones simultáneas apliquen la misma solicitud dos veces.
    const updated = await prisma.$transaction(async (tx) => {
      const { count } = await tx.attendanceJustification.updateMany({
        where: { id, schoolId: principal.schoolId, status: 'PENDING' },
        data: { status: dto.decision, reviewedById: principal.userId, reviewedAt: new Date(), reviewNote: dto.reviewNote ?? null },
      });
      if (count === 0) throw new AppError('Esta justificación ya fue revisada.', 409);
      if (dto.decision === 'APPROVED') {
        await this.applyToAttendance(tx, principal.schoolId, justification.enrollmentId, from, to, id);
      }
      return tx.attendanceJustification.findUniqueOrThrow({ where: { id } });
    }, TX_OPTIONS);

    const studentName = `${enrollment.student.firstNames} ${enrollment.student.lastNamePaternal}`;
    await notificationService
      .createNotification(principal.schoolId, {
        userId: justification.requestedById,
        title: dto.decision === 'APPROVED' ? 'Justificación aprobada' : 'Justificación rechazada',
        message:
          dto.decision === 'APPROVED'
            ? `La justificación de ${studentName} fue aprobada.`
            : `La justificación de ${studentName} fue rechazada.${dto.reviewNote ? ` Motivo: ${dto.reviewNote}` : ''}`,
        type: 'ATTENDANCE',
        link: '/attendance',
      })
      .catch((error) => console.error('[Justification review notify]', error));

    return updated;
  }
}

export const attendanceJustificationService = new AttendanceJustificationService();
