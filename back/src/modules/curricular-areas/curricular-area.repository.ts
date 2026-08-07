import { prisma } from '../../config/prisma';
import type { CurricularArea, CurricularCompetence } from '@prisma/client';
import type {
  CreateCurricularAreaDto,
  UpdateCurricularAreaDto,
  CreateCompetenceDto,
} from './curricular-area.schema';

export interface MineduSeedArea {
  name: string;
  officialCode: string;
  competences?: { name: string; description?: string }[];
}

export function getAreaLevel(area: { name: string; officialCode?: string | null }): 'INITIAL' | 'PRIMARY' | 'SECONDARY' {
  const code = (area.officialCode || '').toUpperCase();
  const name = (area.name || '').toLowerCase();

  if (code.includes('-INI') || code.startsWith('INI-') || name.includes('inicial')) {
    return 'INITIAL';
  }
  if (code.includes('-PRI') || code.startsWith('PRI-') || name.includes('primaria')) {
    return 'PRIMARY';
  }
  if (
    code.includes('-SEC') ||
    code.startsWith('MAT-') ||
    code.startsWith('COM-') ||
    code.startsWith('CCSS-') ||
    code.startsWith('CT-') ||
    code.startsWith('DPCC-') ||
    code.startsWith('EPT-') ||
    code.startsWith('AYC-') ||
    code.startsWith('EF-') ||
    code.startsWith('ER-') ||
    code.startsWith('TOE-') ||
    code.startsWith('RAZ-') ||
    name.includes('secundaria')
  ) {
    return 'SECONDARY';
  }

  return 'PRIMARY';
}

export class CurricularAreaRepository {
  async findAllBySchool(schoolId: string): Promise<CurricularArea[]> {
    return prisma.curricularArea.findMany({
      where: { schoolId },
      include: { competences: true },
      orderBy: { name: 'asc' },
    });
  }

  async findAllPaginated(
    schoolId: string,
    page: number = 1,
    limit: number = 8,
    level: string = 'ALL',
  ): Promise<{ data: CurricularArea[]; total: number; page: number; limit: number; totalPages: number }> {
    const allAreas = await prisma.curricularArea.findMany({
      where: { schoolId },
      include: { competences: true },
      orderBy: { name: 'asc' },
    });

    const filtered = allAreas.filter((area) => {
      if (!level || level === 'ALL') return true;
      return getAreaLevel(area) === level;
    });

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const currentPage = Math.min(Math.max(1, page), totalPages);
    const startIndex = (currentPage - 1) * limit;
    const paginatedData = filtered.slice(startIndex, startIndex + limit);

    return {
      data: paginatedData,
      total,
      page: currentPage,
      limit,
      totalPages,
    };
  }

  async findById(areaId: string, schoolId: string): Promise<CurricularArea | null> {
    return prisma.curricularArea.findFirst({
      where: { id: areaId, schoolId },
      include: { competences: true },
    });
  }

  async create(
    schoolId: string,
    data: CreateCurricularAreaDto,
    defaultCompetences?: { name: string; description?: string }[],
  ): Promise<CurricularArea> {
    return prisma.curricularArea.create({
      data: {
        ...data,
        schoolId,
        competences:
          defaultCompetences && defaultCompetences.length > 0
            ? {
                create: defaultCompetences.map((c) => ({
                  name: c.name,
                  description: c.description,
                })),
              }
            : undefined,
      },
      include: { competences: true },
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

  async findByCodeOrName(
    schoolId: string,
    name: string,
    officialCode?: string,
  ): Promise<CurricularArea | null> {
    const conditions: any[] = [{ name: { equals: name, mode: 'insensitive' } }];
    if (officialCode && officialCode !== 'CUSTOM') {
      conditions.push({ officialCode });
    }
    return prisma.curricularArea.findFirst({
      where: {
        schoolId,
        OR: conditions,
      },
    });
  }

  async countAssignments(areaId: string): Promise<number> {
    return prisma.courseAssignment.count({
      where: { areaId },
    });
  }

  async countGrades(areaId: string): Promise<number> {
    return prisma.grade.count({
      where: {
        competence: { areaId },
      },
    });
  }

  async delete(areaId: string, schoolId: string): Promise<CurricularArea> {
    // Primero eliminar las competencias asociadas para evitar restricción de Foreign Key
    await prisma.curricularCompetence.deleteMany({
      where: { areaId },
    });

    return prisma.curricularArea.delete({
      where: { id: areaId, schoolId },
    });
  }

  async createCompetence(data: CreateCompetenceDto): Promise<CurricularCompetence> {
    return prisma.curricularCompetence.create({ data });
  }

  /** Pre-carga masiva de áreas y competencias oficiales MINEDU SIAGIE */
  async seedMineduAreas(schoolId: string, areas: MineduSeedArea[]): Promise<{ count: number }> {
    let createdCount = 0;

    for (const item of areas) {
      const existing = await prisma.curricularArea.findFirst({
        where: { schoolId, officialCode: item.officialCode },
      });

      if (!existing) {
        await prisma.curricularArea.create({
          data: {
            schoolId,
            name: item.name,
            officialCode: item.officialCode,
            competences: item.competences
              ? {
                  create: item.competences.map((c) => ({
                    name: c.name,
                    description: c.description,
                  })),
                }
              : undefined,
          },
        });
        createdCount++;
      }
    }

    return { count: createdCount };
  }
}
