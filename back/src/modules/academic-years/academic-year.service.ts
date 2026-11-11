import { AppError } from '../../core/errors/app-error';
import { prisma } from '../../config/prisma';
import type { AcademicYearRepository } from './academic-year.repository';
import type { CreateAcademicYearDto, UpdateAcademicYearDto } from './academic-year.schema';
import type { AcademicYear } from '@prisma/client';

export class AcademicYearService {
  constructor(private readonly academicYearRepository: AcademicYearRepository) {}

  private async activateExclusively(schoolId: string, academicYearId: string): Promise<void> {
    await prisma.$transaction([
      prisma.academicYear.updateMany({ where: { schoolId, id: { not: academicYearId } }, data: { isActive: false } }),
      prisma.academicYear.update({ where: { id: academicYearId }, data: { isActive: true } }),
      prisma.enrollment.updateMany({ where: { schoolId, academicYearId: { not: academicYearId }, isActive: true }, data: { isActive: false } }),
    ]);
  }

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

    const created = await this.academicYearRepository.create(schoolId, {
      ...createDto,
      isActive: false,
    });
    if (createDto.isActive === true) {
      await this.activateExclusively(schoolId, created.id);
      created.isActive = true;
    }
    return created;
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

    const updated = await this.academicYearRepository.update(academicYearId, schoolId, updateDto);
    if (updateDto.isActive === true) {
      await this.activateExclusively(schoolId, academicYearId);
    }
    return updated;
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
