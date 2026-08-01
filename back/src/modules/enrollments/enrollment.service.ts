import { AppError } from '../../core/errors/app-error';
import type { EnrollmentRepository } from './enrollment.repository';
import type { CreateEnrollmentDto, UpdateEnrollmentDto } from './enrollment.schema';
import type { Enrollment } from '@prisma/client';

export class EnrollmentService {
  constructor(private readonly enrollmentRepository: EnrollmentRepository) {}

  async getAllEnrollments(schoolId: string): Promise<Enrollment[]> {
    return this.enrollmentRepository.findAllBySchool(schoolId);
  }

  async getEnrollmentById(enrollmentId: string, schoolId: string): Promise<Enrollment> {
    const enrollment = await this.enrollmentRepository.findById(enrollmentId, schoolId);

    if (!enrollment) {
      throw new AppError(`Matrícula con id ${enrollmentId} no encontrada`, 404);
    }

    return enrollment;
  }

  async createEnrollment(
    schoolId: string,
    createEnrollmentDto: CreateEnrollmentDto,
  ): Promise<Enrollment> {
    return this.enrollmentRepository.create(schoolId, createEnrollmentDto);
  }

  async updateEnrollment(
    enrollmentId: string,
    schoolId: string,
    updateEnrollmentDto: UpdateEnrollmentDto,
  ): Promise<Enrollment> {
    await this.getEnrollmentById(enrollmentId, schoolId);
    return this.enrollmentRepository.update(enrollmentId, schoolId, updateEnrollmentDto);
  }
}
