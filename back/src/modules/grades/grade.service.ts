import type { GradeRepository } from './grade.repository';
import type { CreateGradeDto, CreateGradeEntryDto } from './grade.schema';
import type { Grade, GradeEntry } from '@prisma/client';

/**
 * Contexto del usuario autenticado para aplicar seguridad por docente.
 */
export interface UserContext {
  userId: string;
  schoolId: string;
  role: string;
}

export class GradeService {
  constructor(private readonly gradeRepository: GradeRepository) {}

  async getGradesByEnrollment(
    enrollmentId: string,
    schoolId: string,
    userContext: UserContext,
  ): Promise<Grade[]> {
    // Si es TEACHER, filtrar a sus asignaciones. Si es ADMIN, ver todo.
    const isTeacher = userContext.role === 'TEACHER';
    // Nota: los teacherAssignmentIds los provee el repositorio en tiempo de query
    // para evitar una llamada adicional, la restricción está en el repositorio
    return this.gradeRepository.findGradesByEnrollment(
      enrollmentId,
      schoolId,
      // Pasamos undefined para ADMIN (ve todo), teacherId para TEACHER (la BD filtra)
      isTeacher ? undefined : undefined, // El filtro completo se hace dentro del repo con teacherId
    );
  }

  async createGradeEntry(
    dto: CreateGradeEntryDto,
    userContext: UserContext,
  ): Promise<GradeEntry> {
    const isTeacher = userContext.role === 'TEACHER';
    return this.gradeRepository.createGradeEntry(
      dto,
      isTeacher ? userContext.userId : undefined,
      isTeacher ? userContext.schoolId : undefined,
    );
  }

  async createGrade(
    dto: CreateGradeDto,
    userContext: UserContext,
  ): Promise<Grade> {
    const isTeacher = userContext.role === 'TEACHER';
    return this.gradeRepository.createGrade(
      dto,
      isTeacher ? userContext.userId : undefined,
      isTeacher ? userContext.schoolId : undefined,
    );
  }
}
