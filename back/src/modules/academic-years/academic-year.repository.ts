import { prisma } from '../../config/prisma';
import { Prisma, type AcademicYear } from '@prisma/client';
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

  async findByYear(schoolId: string, year: number): Promise<AcademicYear | null> {
    return prisma.academicYear.findFirst({
      where: { schoolId, year },
    });
  }

  async countEnrollments(academicYearId: string): Promise<number> {
    return prisma.enrollment.count({
      where: { academicYearId },
    });
  }

  async create(schoolId: string, data: CreateAcademicYearDto): Promise<AcademicYear> {
    return prisma.academicYear.create({
      data: {
        schoolId,
        year: data.year,
        name: data.name || `Año Escolar ${data.year}`,
        periodType: data.periodType ?? 'BIMESTER',
        periodsConfig: data.periodsConfig ? (data.periodsConfig as Prisma.InputJsonValue) : Prisma.DbNull,
        annualCalculationMode: data.annualCalculationMode ?? 'LAST_PERIOD',
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        // La activación siempre pasa por AcademicYearService.activateExclusively
        isActive: false,
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
        year: data.year,
        name: data.name,
        periodType: data.periodType,
        periodsConfig:
          data.periodsConfig === undefined
            ? undefined
            : data.periodsConfig === null
              ? Prisma.DbNull
              : (data.periodsConfig as Prisma.InputJsonValue),
        annualCalculationMode: data.annualCalculationMode,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        // isActive NO se escribe aquí: lo gestiona AcademicYearService
      },
    });
  }

  async delete(academicYearId: string, schoolId: string): Promise<AcademicYear> {
    return prisma.academicYear.delete({
      where: { id: academicYearId, schoolId },
    });
  }
}
