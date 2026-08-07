import { prisma } from '../../config/prisma';
import type { Grade, GradeEntry } from '@prisma/client';
import type { CreateGradeDto, CreateGradeEntryDto } from './grade.schema';
import { AppError } from '../../core/errors/app-error';

export class GradeRepository {
  /**
   * Busca notas de una matrícula específica.
   * REGLA MULTI-TENANT: filtra por schoolId vía enrollment.
   * Si teacherAssignmentIds está definido, filtra además por los cursos del docente.
   */
  async findGradesByEnrollment(
    enrollmentId: string,
    schoolId: string,
    teacherAssignmentIds?: string[],
  ): Promise<Grade[]> {
    return prisma.grade.findMany({
      where: {
        enrollmentId,
        enrollment: { schoolId },
        // SEGURIDAD: Si se proveen IDs de asignación, limitar a los del docente
        ...(teacherAssignmentIds
          ? { entry: { courseAssignmentId: { in: teacherAssignmentIds } } }
          : {}),
      },
      include: {
        entry: {
          include: { assignment: { include: { area: true, classroom: true } } },
        },
        competence: true,
      },
    });
  }

  /**
   * Crea una entrada de evaluación (GradeEntry).
   * SEGURIDAD CRÍTICA: Verifica que el courseAssignmentId pertenece al docente.
   * Si teacherId está definido (rol TEACHER), valida ownership antes de crear.
   */
  async createGradeEntry(
    data: CreateGradeEntryDto,
    teacherId?: string,
    schoolId?: string,
  ): Promise<GradeEntry> {
    // Verificar ownership si es un profesor
    if (teacherId && schoolId) {
      const assignment = await prisma.courseAssignment.findFirst({
        where: {
          id: data.courseAssignmentId,
          teacherId,
          schoolId,
        },
      });

      if (!assignment) {
        throw new AppError(
          'No tienes permiso para crear evaluaciones en este curso. Solo puedes registrar notas en los cursos asignados por el administrador.',
          403,
        );
      }
    }

    return prisma.gradeEntry.create({ data });
  }

  /**
   * Crea una nota individual para un alumno.
   * SEGURIDAD CRÍTICA: Valida que el GradeEntry pertenece al docente antes de escribir.
   */
  async createGrade(
    data: CreateGradeDto,
    teacherId?: string,
    schoolId?: string,
  ): Promise<Grade> {
    // Si es un profesor, verificar que la GradeEntry le corresponde
    if (teacherId && schoolId) {
      const entry = await prisma.gradeEntry.findFirst({
        where: {
          id: data.gradeEntryId,
          assignment: { teacherId, schoolId },
        },
      });

      if (!entry) {
        throw new AppError(
          'No tienes permiso para registrar esta nota. Solo puedes calificar en tus cursos asignados.',
          403,
        );
      }
    }

    return prisma.grade.create({ data });
  }
}
