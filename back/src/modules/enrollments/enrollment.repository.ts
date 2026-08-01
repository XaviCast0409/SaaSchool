import { prisma } from '../../config/prisma';
import type { Enrollment } from '@prisma/client';
import type { CreateEnrollmentDto, UpdateEnrollmentDto } from './enrollment.schema';

export class EnrollmentRepository {
  async findAllBySchool(schoolId: string): Promise<Enrollment[]> {
    return prisma.enrollment.findMany({
      where: { schoolId },
      include: {
        student: true,
        academicYear: true,
        classroom: true,
      },
    });
  }

  async findById(enrollmentId: string, schoolId: string): Promise<Enrollment | null> {
    return prisma.enrollment.findFirst({
      where: { id: enrollmentId, schoolId },
      include: {
        student: true,
        academicYear: true,
        classroom: true,
      },
    });
  }

  async create(schoolId: string, data: CreateEnrollmentDto): Promise<Enrollment> {
    return prisma.enrollment.create({
      data: { ...data, schoolId },
    });
  }

  async update(
    enrollmentId: string,
    schoolId: string,
    data: UpdateEnrollmentDto,
  ): Promise<Enrollment> {
    return prisma.enrollment.update({
      where: { id: enrollmentId, schoolId },
      data,
    });
  }
}
