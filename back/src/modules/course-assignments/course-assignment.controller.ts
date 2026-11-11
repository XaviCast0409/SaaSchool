import { Request, Response } from 'express';
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
}
