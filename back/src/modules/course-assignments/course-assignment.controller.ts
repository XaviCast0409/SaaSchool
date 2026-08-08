import { Request, Response } from 'express';
import {
  createCourseAssignmentSchema,
  bulkAssignUnidocenteSchema,
  syncTeacherAssignmentsSchema,
} from './course-assignment.schema';
import type { CourseAssignmentService } from './course-assignment.service';

export class CourseAssignmentController {
  constructor(private readonly courseAssignmentService: CourseAssignmentService) {}

  /**
   * GET /api/course-assignments
   * Lista todas las asignaciones del colegio (SCHOOL_ADMIN).
   */
  getAll = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const assignments = await this.courseAssignmentService.getAllBySchool(schoolId);
    response.status(200).json({ status: 'success', data: assignments });
  };

  /**
   * GET /api/course-assignments/my-courses
   * Lista SOLO los cursos asignados al docente autenticado.
   * SEGURIDAD: El teacherId viene del token, nunca del body (no puede ser spoofed).
   */
  getMyCourses = async (request: Request, response: Response): Promise<void> => {
    const { userId: teacherId, schoolId } = request.user!;
    const assignments = await this.courseAssignmentService.getMyAssignments(teacherId, schoolId);
    response.status(200).json({ status: 'success', data: assignments });
  };

  /**
   * POST /api/course-assignments
   * Asigna un área a un docente en un aula (Polidocencia - asignación individual).
   */
  create = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const dto = createCourseAssignmentSchema.parse(request.body);
    const assignment = await this.courseAssignmentService.create(schoolId, dto);
    response.status(201).json({ status: 'success', data: assignment });
  };

  /**
   * POST /api/course-assignments/bulk
   * Asigna TODAS las áreas de un aula a un docente (Unidocencia — un clic).
   */
  bulkAssign = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const dto = bulkAssignUnidocenteSchema.parse(request.body);
    const result = await this.courseAssignmentService.bulkAssignUnidocente(schoolId, dto);
    response.status(201).json({
      status: 'success',
      message: `Se crearon ${result.count} asignaciones docentes (Unidocencia).`,
      data: result,
    });
  };

  /**
   * DELETE /api/course-assignments/:id
   * Elimina una asignación docente.
   */
  delete = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const assignmentId = request.params.id as string;
    await this.courseAssignmentService.delete(assignmentId, schoolId);
    response.status(200).json({
      status: 'success',
      message: 'Asignación docente eliminada correctamente.',
    });
  };

  /**
   * POST /api/course-assignments/sync-teacher
   * Sincroniza la carga horaria completa de un profesor (Checklist batch).
   */
  syncTeacher = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const dto = syncTeacherAssignmentsSchema.parse(request.body);
    const result = await this.courseAssignmentService.syncTeacherAssignments(schoolId, dto);
    response.status(200).json({
      status: 'success',
      message: `Carga horaria actualizada correctamente (${result.count} cursos asignados).`,
      data: result,
    });
  };
}
