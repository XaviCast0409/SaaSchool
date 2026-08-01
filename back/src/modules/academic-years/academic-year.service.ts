import { AppError } from '../../core/errors/app-error';
import type { AcademicYearRepository } from './academic-year.repository';
import type { CreateAcademicYearDto, UpdateAcademicYearDto } from './academic-year.schema';
import type { AcademicYear } from '@prisma/client';

export class AcademicYearService {
  constructor(private readonly academicYearRepository: AcademicYearRepository) {}

  async getAllAcademicYears(schoolId: string): Promise<AcademicYear[]> {
    return this.academicYearRepository.findAllBySchool(schoolId);
  }

  async getAcademicYearById(academicYearId: string, schoolId: string): Promise<AcademicYear> {
    const academicYear = await this.academicYearRepository.findById(academicYearId, schoolId);

    if (!academicYear) {
      throw new AppError(`Año académico con id ${academicYearId} no encontrado`, 404);
    }

    return academicYear;
  }

  async createAcademicYear(
    schoolId: string,
    createDto: CreateAcademicYearDto,
  ): Promise<AcademicYear> {
    return this.academicYearRepository.create(schoolId, createDto);
  }

  async updateAcademicYear(
    academicYearId: string,
    schoolId: string,
    updateDto: UpdateAcademicYearDto,
  ): Promise<AcademicYear> {
    await this.getAcademicYearById(academicYearId, schoolId);
    return this.academicYearRepository.update(academicYearId, schoolId, updateDto);
  }
}
