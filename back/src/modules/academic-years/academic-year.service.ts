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
      throw new AppError(`Año lectivo con id ${academicYearId} no encontrado`, 404);
    }

    return academicYear;
  }

  async createAcademicYear(
    schoolId: string,
    createDto: CreateAcademicYearDto,
  ): Promise<AcademicYear> {
    const existing = await this.academicYearRepository.findByYear(schoolId, createDto.year);
    if (existing) {
      throw new AppError(
        `El Año Lectivo ${createDto.year} ya se encuentra registrado en este colegio.`,
        409,
      );
    }

    return this.academicYearRepository.create(schoolId, createDto);
  }

  async updateAcademicYear(
    academicYearId: string,
    schoolId: string,
    updateDto: UpdateAcademicYearDto,
  ): Promise<AcademicYear> {
    await this.getAcademicYearById(academicYearId, schoolId);

    if (updateDto.year) {
      const existing = await this.academicYearRepository.findByYear(schoolId, updateDto.year);
      if (existing && existing.id !== academicYearId) {
        throw new AppError(
          `Ya existe otro Año Lectivo registrado para el año ${updateDto.year}.`,
          409,
        );
      }
    }

    return this.academicYearRepository.update(academicYearId, schoolId, updateDto);
  }

  async deleteAcademicYear(academicYearId: string, schoolId: string): Promise<AcademicYear> {
    const academicYear = await this.getAcademicYearById(academicYearId, schoolId);

    const enrollmentCount = await this.academicYearRepository.countEnrollments(academicYearId);
    if (enrollmentCount > 0) {
      throw new AppError(
        `No se puede eliminar el Año Lectivo "${academicYear.name || academicYear.year}" porque cuenta con ${enrollmentCount} estudiantes matriculados.`,
        400,
      );
    }

    return this.academicYearRepository.delete(academicYearId, schoolId);
  }
}
