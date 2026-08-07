import { AppError } from '../../core/errors/app-error';
import type { SchoolRepository } from './school.repository';
import type { CreateSchoolDto, UpdateSchoolDto } from './school.schema';
import type { School } from '@prisma/client';

export class SchoolService {
  constructor(private readonly schoolRepository: SchoolRepository) {}

  async getAllSchools(): Promise<School[]> {
    return this.schoolRepository.findAll();
  }

  async getSchoolById(schoolId: string): Promise<School> {
    const school = await this.schoolRepository.findById(schoolId);

    if (!school) {
      throw new AppError(`Colegio con id ${schoolId} no encontrado`, 404);
    }

    return school;
  }

  async createSchool(createSchoolDto: CreateSchoolDto): Promise<School> {
    return this.schoolRepository.create(createSchoolDto);
  }

  async updateSchool(schoolId: string, updateSchoolDto: UpdateSchoolDto): Promise<School> {
    await this.getSchoolById(schoolId);
    return this.schoolRepository.update(schoolId, updateSchoolDto);
  }

  async deactivateSchool(schoolId: string): Promise<School> {
    await this.getSchoolById(schoolId);
    return this.schoolRepository.deactivate(schoolId);
  }

  async reactivateSchool(schoolId: string): Promise<School> {
    await this.getSchoolById(schoolId);
    return this.schoolRepository.reactivate(schoolId);
  }
}
