import { prisma } from '../../config/prisma';
import type { School } from '@prisma/client';
import type { CreateSchoolDto, UpdateSchoolDto } from './school.schema';

/**
 * SchoolRepository: Acceso a datos del modelo School.
 * No requiere filtro por schoolId propio (es el tenant root),
 * pero sí en listados para SUPER_ADMIN.
 */
export class SchoolRepository {
  async findAll(): Promise<School[]> {
    return prisma.school.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(schoolId: string): Promise<School | null> {
    return prisma.school.findUnique({
      where: { id: schoolId },
    });
  }

  async create(data: CreateSchoolDto): Promise<School> {
    return prisma.school.create({ data });
  }

  async update(schoolId: string, data: UpdateSchoolDto): Promise<School> {
    return prisma.school.update({
      where: { id: schoolId },
      data,
    });
  }

  async deactivate(schoolId: string): Promise<School> {
    return prisma.school.update({
      where: { id: schoolId },
      data: { isActive: false },
    });
  }
}
