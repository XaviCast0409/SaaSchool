import type { CourseAssignment } from '@prisma/client';
import { AppError } from '../../core/errors/app-error';
import type { CourseAssignmentRepository } from './course-assignment.repository';
import type { CreateCourseAssignmentDto, BulkAssignUnidocenteDto } from './course-assignment.schema';

export class CourseAssignmentService {
  constructor(private readonly courseAssignmentRepository: CourseAssignmentRepository) {}

  async getAllBySchool(schoolId: string): Promise<CourseAssignment[]> {
    return this.courseAssignmentRepository.findAllBySchool(schoolId);
  }

  async getMyAssignments(teacherId: string, schoolId: string): Promise<CourseAssignment[]> {
    return this.courseAssignmentRepository.findByTeacher(teacherId, schoolId);
  }

  async create(schoolId: string, dto: CreateCourseAssignmentDto): Promise<CourseAssignment> {
    return this.courseAssignmentRepository.create(schoolId, dto);
  }

  async bulkAssignUnidocente(
    schoolId: string,
    dto: BulkAssignUnidocenteDto,
  ): Promise<{ count: number }> {
    const result = await this.courseAssignmentRepository.bulkCreate(
      schoolId,
      dto.classroomId,
      dto.teacherId,
      dto.areaIds,
    );
    return result;
  }

  async delete(assignmentId: string, schoolId: string): Promise<void> {
    const assignment = await this.courseAssignmentRepository
      .findAllBySchool(schoolId)
      .then((list) => list.find((a) => a.id === assignmentId));

    if (!assignment) {
      throw new AppError('Asignación docente no encontrada o no pertenece a este colegio', 404);
    }

    await this.courseAssignmentRepository.delete(assignmentId, schoolId);
  }
}
