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
    return prisma.enrollment.create({
      data: { ...data, schoolId },
    });
  }

  async update(
    enrollmentId: string,
    schoolId: string,
    data: UpdateEnrollmentDto,
    existingEnrollment?: Enrollment | null,
  ): Promise<Enrollment> {
    const isStateChange = data.enrollmentState === 'WITHDRAWN' || data.enrollmentState === 'TRANSFERRED';
    const isClassroomChange = Boolean(
      data.classroomId &&
      existingEnrollment &&
      data.classroomId !== existingEnrollment.classroomId,
    );

    if (isStateChange || isClassroomChange) {
      return prisma.$transaction(async (tx) => {
        // Conexión 3: Migración automática de notas y conclusiones al cambiar de aula
        if (isClassroomChange && existingEnrollment && data.classroomId) {
          const oldAssignments = await tx.courseAssignment.findMany({
            where: { schoolId, classroomId: existingEnrollment.classroomId, deletedAt: null },
          });
          const newAssignments = await tx.courseAssignment.findMany({
            where: { schoolId, classroomId: data.classroomId, deletedAt: null },
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
