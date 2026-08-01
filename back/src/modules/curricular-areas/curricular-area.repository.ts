import { prisma } from '../../config/prisma';
import type { CurricularArea, CurricularCompetence } from '@prisma/client';
import type {
  CreateCurricularAreaDto,
  UpdateCurricularAreaDto,
  CreateCompetenceDto,
} from './curricular-area.schema';

export class CurricularAreaRepository {
  async findAllBySchool(schoolId: string): Promise<CurricularArea[]> {
    return prisma.curricularArea.findMany({
      where: { schoolId },
      include: { competences: true },
      orderBy: { name: 'asc' },
    });
  }

  async findById(areaId: string, schoolId: string): Promise<CurricularArea | null> {
    return prisma.curricularArea.findFirst({
      where: { id: areaId, schoolId },
      include: { competences: true },
    });
  }

  async create(schoolId: string, data: CreateCurricularAreaDto): Promise<CurricularArea> {
    return prisma.curricularArea.create({
      data: { ...data, schoolId },
    });
  }

  async update(
    areaId: string,
    schoolId: string,
    data: UpdateCurricularAreaDto,
  ): Promise<CurricularArea> {
    return prisma.curricularArea.update({
      where: { id: areaId, schoolId },
      data,
    });
  }

  async createCompetence(data: CreateCompetenceDto): Promise<CurricularCompetence> {
    return prisma.curricularCompetence.create({ data });
  }
}
