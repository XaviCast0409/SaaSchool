import type { CourseAssignment } from '@prisma/client';
import type { CourseAssignmentRepository } from './course-assignment.repository';

export class CourseAssignmentService {
  constructor(private readonly courseAssignmentRepository: CourseAssignmentRepository) {}

  async getAllBySchool(schoolId: string): Promise<CourseAssignment[]> {
    return this.courseAssignmentRepository.findAllBySchool(schoolId);
  }

  async getMyAssignments(teacherId: string, schoolId: string): Promise<CourseAssignment[]> {
    return this.courseAssignmentRepository.findByTeacher(teacherId, schoolId);
  }
}
