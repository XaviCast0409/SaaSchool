import { AppError } from '../../core/errors/app-error';
import type { SchoolRepository } from './school.repository';
import type { CreateSchoolDto, UpdateSchoolDto } from './school.schema';
import type { School } from '@prisma/client';
import { getPlanStatus, effectiveMonthlyFee, type PlanStatus } from './plan.rules';

/** Colegio tal como lo devuelve la API: mensualidad como número y estado de su plan. */
export type SchoolView = Omit<School, 'monthlyFee'> & {
  monthlyFee: number | null;
  effectiveMonthlyFee: number;
  planStatus: PlanStatus;
};

const toView = (school: School): SchoolView => ({
  ...school,
  monthlyFee: school.monthlyFee === null ? null : Number(school.monthlyFee),
  effectiveMonthlyFee: effectiveMonthlyFee(school),
  planStatus: getPlanStatus(school.planExpiresAt),
});

export class SchoolService {
  constructor(private readonly schoolRepository: SchoolRepository) {}

  async getAllSchools(): Promise<SchoolView[]> {
    return (await this.schoolRepository.findAll()).map(toView);
  }

  async getSchoolById(schoolId: string): Promise<SchoolView> {
    return toView(await this.findOrFail(schoolId));
  }

  private async findOrFail(schoolId: string): Promise<School> {
    const school = await this.schoolRepository.findById(schoolId);

    if (!school) {
      throw new AppError(`Colegio con id ${schoolId} no encontrado`, 404);
    }

    return school;
  }

  async createSchool(createSchoolDto: CreateSchoolDto): Promise<SchoolView> {
    return toView(await this.schoolRepository.create(createSchoolDto));
  }

  async updateSchool(schoolId: string, updateSchoolDto: UpdateSchoolDto): Promise<SchoolView> {
    await this.findOrFail(schoolId);
    return toView(await this.schoolRepository.update(schoolId, updateSchoolDto));
  }

  async deactivateSchool(schoolId: string): Promise<SchoolView> {
    await this.findOrFail(schoolId);
    return toView(await this.schoolRepository.deactivate(schoolId));
  }

  async reactivateSchool(schoolId: string): Promise<SchoolView> {
    await this.findOrFail(schoolId);
    return toView(await this.schoolRepository.reactivate(schoolId));
  }

  async resetAdminPassword(
    schoolId: string,
    newPassword?: string,
  ): Promise<{ adminEmail: string; newPassword: string; adminName: string }> {
    await this.findOrFail(schoolId);
    return this.schoolRepository.resetAdminPassword(schoolId, newPassword);
  }
}
