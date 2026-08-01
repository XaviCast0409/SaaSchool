import { prisma } from '../../config/prisma';
import type { AcademicYear } from '@prisma/client';
import type { CreateAcademicYearDto, UpdateAcademicYearDto } from './academic-year.schema';

export class AcademicYearRepository {
  async findAllBySchool(schoolId: string): Promise<AcademicYear[]> {
    return prisma.academicYear.findMany({
      where: { schoolId },
      orderBy: { year: 'desc' },
    });
  }

  async findById(academicYearId: string, schoolId: string): Promise<AcademicYear | null> {
    return prisma.academicYear.findFirst({
      where: { id: academicYearId, schoolId },
    });
  }

  async create(schoolId: string, data: CreateAcademicYearDto): Promise<AcademicYear> {
    return prisma.academicYear.create({
      data: {
        ...data,
        schoolId,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
      },
    });
  }

  async update(
    academicYearId: string,
    schoolId: string,
    data: UpdateAcademicYearDto,
  ): Promise<AcademicYear> {
    return prisma.academicYear.update({
      where: { id: academicYearId, schoolId },
      data: {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      },
    });
  }
}
