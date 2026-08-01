import { prisma } from '../../config/prisma';
import type { Grade, GradeEntry } from '@prisma/client';
import type { CreateGradeDto, CreateGradeEntryDto } from './grade.schema';

export class GradeRepository {
  async findAllGradeEntriesBySchool(schoolId: string): Promise<GradeEntry[]> {
    return prisma.gradeEntry.findMany({
      where: { assignment: { schoolId } },
      include: { grades: true },
    });
  }

  async createGradeEntry(data: CreateGradeEntryDto): Promise<GradeEntry> {
    return prisma.gradeEntry.create({ data });
  }

  async createGrade(data: CreateGradeDto): Promise<Grade> {
    return prisma.grade.create({ data });
  }

  async findGradesByEnrollment(enrollmentId: string, schoolId: string): Promise<Grade[]> {
    return prisma.grade.findMany({
      where: {
        enrollmentId,
        enrollment: { schoolId },
      },
      include: {
        entry: true,
        competence: true,
      },
    });
  }
}
