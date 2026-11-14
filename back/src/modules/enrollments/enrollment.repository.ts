import { prisma } from '../../config/prisma';
import type { Enrollment } from '@prisma/client';
import { AppError } from '../../core/errors/app-error';
import { getSchoolNow } from '../../utils/timezone.util';
import { feeScheduleService, type ScheduleResult } from '../payments/fee-schedule.service';
import type { CreateEnrollmentDto, UpdateEnrollmentDto } from './enrollment.schema';

export class EnrollmentRepository {
  async findAllBySchool(schoolId: string, academicYearId?: string): Promise<Enrollment[]> {
    return prisma.enrollment.findMany({
      where: { schoolId, ...(academicYearId ? { academicYearId } : {}) },
      include: {
        student: true,
        academicYear: true,
        classroom: true,
      },
    });
  }

  async findById(enrollmentId: string, schoolId: string): Promise<Enrollment | null> {
    return prisma.enrollment.findFirst({
      where: { id: enrollmentId, schoolId },
      include: {
        student: true,
        academicYear: true,
        classroom: true,
      },
    });
  }

  /** Crea la matrícula y, en la misma transacción, su cronograma de cuotas según el tarifario. */
  async create(schoolId: string, data: CreateEnrollmentDto): Promise<{ enrollment: Enrollment; schedule: ScheduleResult }> {
    return prisma.$transaction(async (tx) => {
      const year = await tx.academicYear.findFirst({ where: { id: data.academicYearId, schoolId }, select: { isActive: true } });
      if (!year) throw new AppError('Año académico no encontrado.', 404);
      // Regla: isActive = matrícula del año activo y registrada (ver syncEnrollmentActiveFlags)
      const enrollment = await tx.enrollment.create({
        data: { ...data, schoolId, isActive: year.isActive },
      });
      const schedule = await feeScheduleService.generateForEnrollmentInTx(tx, schoolId, enrollment.id);
      return { enrollment, schedule };
    });
  }

  async update(
    enrollmentId: string,
    schoolId: string,
    input: UpdateEnrollmentDto,
    existingEnrollment?: Enrollment | null,
    actorUserId: string | null = null,
  ): Promise<Enrollment & { cancelledObligations?: number }> {
    // isActive nunca lo decide el cliente: se deriva del estado y del año activo
    const { isActive: _ignored, stateChangeDate, ...rest } = input as UpdateEnrollmentDto & { isActive?: boolean };
    void _ignored;
    const data: Omit<UpdateEnrollmentDto, 'stateChangeDate'> = rest;
    const newState = data.enrollmentState;
    // Solo al pasar de REGISTERED a retirado/trasladado (no al repetir el mismo estado)
    const isStateChange =
      (newState === 'WITHDRAWN' || newState === 'TRANSFERRED') && existingEnrollment?.enrollmentState !== newState;
    if (data.enrollmentState && existingEnrollment) {
      const year = await prisma.academicYear.findUnique({ where: { id: existingEnrollment.academicYearId }, select: { isActive: true } });
      (data as UpdateEnrollmentDto & { isActive?: boolean }).isActive = data.enrollmentState === 'REGISTERED' && !!year?.isActive;
    }
    const isClassroomChange = Boolean(
      data.classroomId &&
      existingEnrollment &&
      data.classroomId !== existingEnrollment.classroomId,
    );

    if (isStateChange || isClassroomChange) {
      return prisma.$transaction(async (tx) => {
        // Conexión 3: Migración automática de notas y conclusiones al cambiar de aula
        if (isClassroomChange && existingEnrollment && data.classroomId) {
          // Solo las asignaciones del MISMO año de la matrícula
          const oldAssignments = await tx.courseAssignment.findMany({
            where: { schoolId, classroomId: existingEnrollment.classroomId, academicYearId: existingEnrollment.academicYearId, deletedAt: null },
          });
          const newAssignments = await tx.courseAssignment.findMany({
            where: { schoolId, classroomId: data.classroomId, academicYearId: existingEnrollment.academicYearId, deletedAt: null },
          });

          for (const oldAssignment of oldAssignments) {
            const matchedNewAssignment = newAssignments.find(
              (na) => na.areaId === oldAssignment.areaId,
            );
            if (matchedNewAssignment) {
              await tx.detailedGrade.updateMany({
                where: {
                  schoolId,
                  enrollmentId,
                  courseAssignmentId: oldAssignment.id,
                },
                data: {
                  courseAssignmentId: matchedNewAssignment.id,
                },
              });

              await tx.competenceConclusion.updateMany({
                where: {
                  schoolId,
                  enrollmentId,
                  courseAssignmentId: oldAssignment.id,
                },
                data: {
                  courseAssignmentId: matchedNewAssignment.id,
                },
              });

              await tx.competencePeriodResult.updateMany({
                where: { schoolId, enrollmentId, courseAssignmentId: oldAssignment.id },
                data: { courseAssignmentId: matchedNewAssignment.id },
              });
            }
          }
        }

        const updated = await tx.enrollment.update({
          where: { id: enrollmentId, schoolId },
          data,
        });

        // Anular con motivo las cuotas que vencen después del retiro o traslado (la deuda anterior queda)
        if (isStateChange && (newState === 'WITHDRAWN' || newState === 'TRANSFERRED')) {
          const cancelledObligations = await feeScheduleService.cancelFutureInTx(
            tx,
            schoolId,
            enrollmentId,
            newState,
            stateChangeDate ?? getSchoolNow().dateStr,
            actorUserId,
          );
          return { ...updated, cancelledObligations };
        }

        return updated;
      });
    }

    return prisma.enrollment.update({
      where: { id: enrollmentId, schoolId },
      data,
    });
  }
}
