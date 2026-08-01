import { AppError } from '../../core/errors/app-error';
import type { CurricularAreaRepository } from './curricular-area.repository';
import type {
  CreateCurricularAreaDto,
  UpdateCurricularAreaDto,
  CreateCompetenceDto,
} from './curricular-area.schema';
import type { CurricularArea, CurricularCompetence } from '@prisma/client';

export class CurricularAreaService {
  constructor(private readonly curricularAreaRepository: CurricularAreaRepository) {}

  async getAllAreas(schoolId: string): Promise<CurricularArea[]> {
    return this.curricularAreaRepository.findAllBySchool(schoolId);
  }

  async getAreaById(areaId: string, schoolId: string): Promise<CurricularArea> {
    const area = await this.curricularAreaRepository.findById(areaId, schoolId);

    if (!area) {
      throw new AppError(`Área curricular con id ${areaId} no encontrada`, 404);
    }

    return area;
  }

  async createArea(
    schoolId: string,
    createAreaDto: CreateCurricularAreaDto,
  ): Promise<CurricularArea> {
    return this.curricularAreaRepository.create(schoolId, createAreaDto);
  }

  async updateArea(
    areaId: string,
    schoolId: string,
    updateAreaDto: UpdateCurricularAreaDto,
  ): Promise<CurricularArea> {
    await this.getAreaById(areaId, schoolId);
    return this.curricularAreaRepository.update(areaId, schoolId, updateAreaDto);
  }

  async createCompetence(
    schoolId: string,
    createCompetenceDto: CreateCompetenceDto,
  ): Promise<CurricularCompetence> {
    // Verificar que el área pertenece al colegio (tenant check)
    await this.getAreaById(createCompetenceDto.areaId, schoolId);
    return this.curricularAreaRepository.createCompetence(createCompetenceDto);
  }
}
