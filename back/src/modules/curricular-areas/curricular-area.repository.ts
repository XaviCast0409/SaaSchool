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
  isTransversal?: boolean;
  officialAreaCode?: string;
  competences?: { name: string; description?: string; officialCompetenceCode?: string }[];
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
    code.startsWith('SEC-') ||
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
      include: {
        competences: true,
        parentArea: { select: { id: true, name: true, officialAreaCode: true } },
        subAreas: true,
      },
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
      include: {
        competences: true,
        parentArea: { select: { id: true, name: true, officialAreaCode: true } },
        subAreas: true,
      },
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
      include: {
        competences: true,
        parentArea: { select: { id: true, name: true, officialAreaCode: true } },
        subAreas: true,
      },
    });
  }

  async create(
    schoolId: string,
    data: CreateCurricularAreaDto,
    defaultCompetences?: { name: string; description?: string; officialCompetenceCode?: string }[],
  ): Promise<CurricularArea> {
    return prisma.curricularArea.create({
      data: {
        schoolId,
        name: data.name,
        officialCode: data.officialCode,
        officialAreaCode: data.officialAreaCode,
        parentAreaId: data.parentAreaId || null,
        evaluatedCompetenceIds: data.evaluatedCompetenceIds || [],
        isActive: data.isActive ?? true,
        competences:
          defaultCompetences && defaultCompetences.length > 0 && !data.parentAreaId
            ? {
                create: defaultCompetences.map((c) => ({
                  name: c.name,
                  description: c.description,
                  officialCompetenceCode: c.officialCompetenceCode || null,
                })),
              }
            : undefined,
      },
      include: {
        competences: true,
        parentArea: { select: { id: true, name: true, officialAreaCode: true } },
        subAreas: true,
      },
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
      include: {
        competences: true,
        parentArea: { select: { id: true, name: true, officialAreaCode: true } },
        subAreas: true,
      },
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

  async findCompetenceById(competenceId: string) {
    return prisma.curricularCompetence.findUnique({
      where: { id: competenceId },
      include: { area: true },
    });
  }

  async countCompetenceGrades(competenceId: string): Promise<number> {
    const detailed = await prisma.detailedGrade.count({ where: { competenceId } });
    const legacy = await prisma.grade.count({ where: { competenceId } });
    return detailed + legacy;
  }

  async deleteCompetence(competenceId: string): Promise<CurricularCompetence> {
    return prisma.curricularCompetence.delete({
      where: { id: competenceId },
    });
  }

  async updateCompetence(
    competenceId: string,
    data: { name?: string; description?: string | null; isActive?: boolean },
  ): Promise<CurricularCompetence> {
    return prisma.curricularCompetence.update({
      where: { id: competenceId },
      data,
    });
  }

  async copyParentCompetences(areaId: string, parentAreaId: string): Promise<number> {
    const parentCompetences = await prisma.curricularCompetence.findMany({
      where: { areaId: parentAreaId },
    });

    if (parentCompetences.length === 0) return 0;

    let copied = 0;
    for (const pc of parentCompetences) {
      const exists = await prisma.curricularCompetence.findFirst({
        where: { areaId, name: pc.name },
      });
      if (!exists) {
        await prisma.curricularCompetence.create({
          data: {
            areaId,
            name: pc.name,
            description: pc.description,
            isActive: true,
          },
        });
        copied++;
      }
    }
    return copied;
  }

  /** Pre-carga masiva de áreas y competencias oficiales MINEDU SIAGIE */
  async seedMineduAreas(schoolId: string, areas: MineduSeedArea[]): Promise<{ count: number }> {
    let createdCount = 0;

    for (const item of areas) {
      const existing = await prisma.curricularArea.findFirst({
        where: { schoolId, officialCode: item.officialCode },
        include: { competences: true },
      });

      if (!existing) {
        await prisma.curricularArea.create({
          data: {
            schoolId,
            name: item.name,
            officialCode: item.officialCode,
            isTransversal: item.isTransversal || false,
            officialAreaCode: item.officialAreaCode || null,
            parentAreaId: null,
            evaluatedCompetenceIds: [],
            competences: item.competences
              ? {
                  create: item.competences.map((c) => ({
                    name: c.name,
                    description: c.description,
                    officialCompetenceCode: c.officialCompetenceCode || null,
                  })),
                }
              : undefined,
          },
        });
        createdCount++;
      } else {
        if (!existing.officialAreaCode && item.officialAreaCode) {
          await prisma.curricularArea.update({
            where: { id: existing.id },
            data: { officialAreaCode: item.officialAreaCode },
          });
        }
        if (item.competences && item.competences.length > 0) {
          for (const c of item.competences) {
            const hasComp = existing.competences.some(
              (ec) =>
                (c.officialCompetenceCode && ec.officialCompetenceCode === c.officialCompetenceCode) ||
                ec.name.toLowerCase().trim() === c.name.toLowerCase().trim(),
            );
            if (!hasComp) {
              await prisma.curricularCompetence.create({
                data: {
                  areaId: existing.id,
                  name: c.name,
                  description: c.description,
                  officialCompetenceCode: c.officialCompetenceCode || null,
                  isActive: true,
                },
              });
            }
          }
        }
      }
    }

    return { count: createdCount };
  }
}
