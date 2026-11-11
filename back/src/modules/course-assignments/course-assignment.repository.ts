import { prisma } from '../../config/prisma';
import type { CourseAssignment } from '@prisma/client';

export class CourseAssignmentRepository {
  /**
   * Lista todas las asignaciones docentes de un colegio.
   * Incluye datos relacionados para el panel de administración.
   * REGLA MULTI-TENANT: siempre filtra por schoolId.
   */
  async findAllBySchool(schoolId: string): Promise<CourseAssignment[]> {
    return prisma.courseAssignment.findMany({
      where: { schoolId, deletedAt: null, academicYear: { isActive: true } },
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
      where: { teacherId, schoolId, deletedAt: null, academicYear: { isActive: true } },
      include: {
        classroom: true,
        area: { include: { competences: true } },
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
      where: { id: courseAssignmentId, teacherId, schoolId, deletedAt: null },
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
      where: { teacherId, classroomId, areaId, schoolId, deletedAt: null, academicYear: { isActive: true } },
    });
  }

  /**
   * Lista todos los IDs de CourseAssignment de un docente para filtrar notas.
   * SEGURIDAD: Usado por GradeRepository para filtrar notas del profesor.
   */
  async findTeacherAssignmentIds(teacherId: string, schoolId: string): Promise<string[]> {
    const assignments = await prisma.courseAssignment.findMany({
      where: { teacherId, schoolId, deletedAt: null, academicYear: { isActive: true } },
      select: { id: true },
    });
    return assignments.map((a) => a.id);
  }
}
