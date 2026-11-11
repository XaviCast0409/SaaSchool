import { prisma } from '../../config/prisma';
import type { Enrollment } from '@prisma/client';
import type { CreateEnrollmentDto, UpdateEnrollmentDto } from './enrollment.schema';

export class EnrollmentRepository {
  async findAllBySchool(schoolId: string): Promise<Enrollment[]> {
    return prisma.enrollment.findMany({
      where: { schoolId },
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

  async create(schoolId: string, data: CreateEnrollmentDto): Promise<Enrollment> {
    const year = await prisma.academicYear.findFirst({ where: { id: data.academicYearId, schoolId }, select: { isActive: true } });
    // Regla: isActive = matrícula del año activo y registrada (ver syncEnrollmentActiveFlags)
    return prisma.enrollment.create({
      data: { ...data, schoolId, isActive: !!year?.isActive },
    });
  }

  async update(
    enrollmentId: string,
    schoolId: string,
    data: UpdateEnrollmentDto,
    existingEnrollment?: Enrollment | null,
  ): Promise<Enrollment> {
    const isStateChange = data.enrollmentState === 'WITHDRAWN' || data.enrollmentState === 'TRANSFERRED';
    // isActive nunca lo decide el cliente: se deriva del estado y del año activo
    const { isActive: _ignored, ...rest } = data as UpdateEnrollmentDto & { isActive?: boolean };
    void _ignored;
    data = rest;
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

        // Cancelar automáticamente pensiones futuras pendientes por retiro o traslado
        if (isStateChange) {
          await tx.paymentObligation.updateMany({
            where: {
              schoolId,
              enrollmentId,
              status: 'PENDING',
              dueDate: { gt: new Date() },
            },
            data: {
              status: 'CANCELLED',
            },
          });
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
