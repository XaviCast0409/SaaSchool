import { prisma } from '../../config/prisma';
import type { CourseAssignment } from '@prisma/client';
import type { CreateCourseAssignmentDto } from './course-assignment.schema';

export class CourseAssignmentRepository {
  /**
   * Lista todas las asignaciones docentes de un colegio.
   * Incluye datos relacionados para el panel de administración.
   * REGLA MULTI-TENANT: siempre filtra por schoolId.
   */
  async findAllBySchool(schoolId: string): Promise<CourseAssignment[]> {
    return prisma.courseAssignment.findMany({
      where: { schoolId },
      include: {
        classroom: true,
        area: true,
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastNamePaternal: true,
            lastNameMaternal: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: [
        { classroom: { educationLevel: 'asc' } },
        { classroom: { grade: 'asc' } },
        { classroom: { section: 'asc' } },
      ],
    });
  }

  /**
   * Lista SOLO las asignaciones del docente autenticado.
   * SEGURIDAD: Un TEACHER solo puede ver sus propios cursos asignados.
   * REGLA MULTI-TENANT: filtra por schoolId + teacherId.
   */
  async findByTeacher(teacherId: string, schoolId: string): Promise<CourseAssignment[]> {
    return prisma.courseAssignment.findMany({
      where: { teacherId, schoolId },
      include: {
        classroom: true,
        area: { include: { competences: true } },
      },
      orderBy: [
        { classroom: { educationLevel: 'asc' } },
        { classroom: { grade: 'asc' } },
        { area: { name: 'asc' } },
      ],
    });
  }

  /**
   * Verifica si el docente tiene asignación para un CourseAssignment específico.
   * SEGURIDAD CRÍTICA: Usado antes de permitir escritura de notas/asistencia.
   */
  async verifyTeacherOwnership(
    courseAssignmentId: string,
    teacherId: string,
    schoolId: string,
  ): Promise<boolean> {
    const assignment = await prisma.courseAssignment.findFirst({
      where: { id: courseAssignmentId, teacherId, schoolId },
    });
    return assignment !== null;
  }

  /**
   * Verifica si el docente tiene asignación para un aula + área específicos.
   * SEGURIDAD CRÍTICA: Usado para validar acceso a notas por classroom + area.
   */
  async verifyTeacherHasClassroomArea(
    teacherId: string,
    classroomId: string,
    areaId: string,
    schoolId: string,
  ): Promise<CourseAssignment | null> {
    return prisma.courseAssignment.findFirst({
      where: { teacherId, classroomId, areaId, schoolId },
    });
  }

  /**
   * Crea una nueva asignación docente (un área en un aula para un profesor).
   * La restricción @@unique([classroomId, areaId]) en el schema previene duplicados.
   */
  async create(schoolId: string, data: CreateCourseAssignmentDto): Promise<CourseAssignment> {
    return prisma.courseAssignment.create({
      data: { ...data, schoolId },
      include: {
        classroom: true,
        area: true,
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastNamePaternal: true,
            lastNameMaternal: true,
          },
        },
      },
    });
  }

  /**
   * Crea múltiples asignaciones (Unidocencia: un profesor para TODAS las áreas de un aula).
   * Usa createMany para eficiencia. Ignora duplicados con skipDuplicates.
   */
  async bulkCreate(
    schoolId: string,
    classroomId: string,
    teacherId: string,
    areaIds: string[],
  ): Promise<{ count: number }> {
    return prisma.courseAssignment.createMany({
      data: areaIds.map((areaId) => ({ schoolId, classroomId, areaId, teacherId })),
      skipDuplicates: true,
    });
  }

  /**
   * Elimina una asignación. Valida schoolId para aislamiento multi-tenant.
   */
  async delete(assignmentId: string, schoolId: string): Promise<CourseAssignment> {
    return prisma.courseAssignment.delete({
      where: { id: assignmentId, schoolId },
    });
  }

  /**
   * Lista todos los IDs de CourseAssignment de un docente para filtrar notas.
   * SEGURIDAD: Usado por GradeRepository para filtrar notas del profesor.
   */
  async findTeacherAssignmentIds(teacherId: string, schoolId: string): Promise<string[]> {
    const assignments = await prisma.courseAssignment.findMany({
      where: { teacherId, schoolId },
      select: { id: true },
    });
    return assignments.map((a) => a.id);
  }
}
