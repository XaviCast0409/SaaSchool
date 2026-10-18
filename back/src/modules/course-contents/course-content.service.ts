import { CourseContentRepository } from './course-content.repository';
import type { CreateCourseContentDto, SupervisionFilterDto } from './course-content.schema';
import { AppError } from '../../core/errors/app-error';

export class CourseContentService {
  constructor(private readonly repository: CourseContentRepository) {}

  async getByAssignment(schoolId: string, courseAssignmentId: string, bimester?: number) {
    const assignment = await this.repository.findAssignmentById(schoolId, courseAssignmentId);
    if (!assignment) {
      throw new AppError('Asignación de curso no encontrada o no pertenece a tu colegio.', 404);
    }

    const contents = await this.repository.findByAssignment(schoolId, courseAssignmentId, bimester);
    return {
      assignment: {
        id: assignment.id,
        areaName: assignment.area.name,
        classroomLabel: `${assignment.classroom.grade}° "${assignment.classroom.section}" - ${assignment.classroom.educationLevel}`,
        teacher: assignment.teacher,
      },
      bimester: bimester || null,
      contents,
    };
  }

  async getById(schoolId: string, id: string) {
    const content = await this.repository.findById(schoolId, id);
    if (!content) {
      throw new AppError('Publicación no encontrada.', 404);
    }
    return content;
  }

  async create(schoolId: string, user: { id: string; role: string }, data: CreateCourseContentDto) {
    const assignment = await this.repository.findAssignmentById(schoolId, data.courseAssignmentId);
    if (!assignment) {
      throw new AppError('Asignación de curso no encontrada en tu institución.', 404);
    }

    // Si es docente, solo puede publicar en sus propios cursos
    if (user.role === 'TEACHER' && assignment.teacherId !== user.id) {
      throw new AppError('No tienes permisos para publicar en un curso asignado a otro docente.', 403);
    }

    return this.repository.create(schoolId, user.id, data);
  }

  async delete(schoolId: string, user: { id: string; role: string }, id: string) {
    const content = await this.repository.findById(schoolId, id);
    if (!content) {
      throw new AppError('Publicación no encontrada.', 404);
    }

    const isAdmin = user.role === 'SCHOOL_ADMIN' || user.role === 'SUPER_ADMIN' || user.role === 'ADMINISTRATIVE';
    if (!isAdmin && content.teacherId !== user.id) {
      throw new AppError('No tienes permisos para eliminar esta publicación.', 403);
    }

    await this.repository.delete(schoolId, id);
    return { success: true, message: 'Publicación eliminada correctamente.' };
  }

  async getComments(schoolId: string, courseContentId: string) {
    const content = await this.repository.findById(schoolId, courseContentId);
    if (!content) {
      throw new AppError('Publicación no encontrada.', 404);
    }

    if (content.contentType !== 'FORUM') {
      throw new AppError('Esta publicación no es un foro de discusión.', 400);
    }

    return this.repository.findComments(schoolId, courseContentId);
  }

  async addComment(schoolId: string, userId: string, courseContentId: string, content: string) {
    const forum = await this.repository.findById(schoolId, courseContentId);
    if (!forum) {
      throw new AppError('Foro de discusión no encontrado.', 404);
    }

    if (forum.contentType !== 'FORUM') {
      throw new AppError('Solo se pueden agregar comentarios a publicaciones de tipo FORO.', 400);
    }

    return this.repository.addComment(schoolId, courseContentId, userId, content);
  }

  async getStudentCourses(schoolId: string, studentId: string) {
    const studentData = await this.repository.findStudentCourses(schoolId, studentId);
    if (!studentData) {
      throw new AppError('El estudiante no cuenta con matrícula activa para este ciclo escolar.', 404);
    }
    return studentData;
  }

  async getStudentTasks(schoolId: string, studentId: string) {
    return this.repository.findStudentTasks(schoolId, studentId);
  }

  async getSupervisionStats(schoolId: string, bimester?: number) {
    return this.repository.getSupervisionStats(schoolId, bimester);
  }

  async getTeacherCompliance(schoolId: string, bimester?: number) {
    return this.repository.getTeacherCompliance(schoolId, bimester);
  }

  async getSupervisedFeed(schoolId: string, filters: SupervisionFilterDto) {
    return this.repository.findSupervisedFeed(schoolId, filters);
  }
}

