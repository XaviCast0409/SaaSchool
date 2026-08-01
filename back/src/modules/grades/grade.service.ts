import type { GradeRepository } from './grade.repository';
import type { CreateGradeDto, CreateGradeEntryDto } from './grade.schema';
import type { Grade, GradeEntry } from '@prisma/client';

export class GradeService {
  constructor(private readonly gradeRepository: GradeRepository) {}

  async getGradesByEnrollment(enrollmentId: string, schoolId: string): Promise<Grade[]> {
    return this.gradeRepository.findGradesByEnrollment(enrollmentId, schoolId);
  }

  async createGradeEntry(createGradeEntryDto: CreateGradeEntryDto): Promise<GradeEntry> {
    return this.gradeRepository.createGradeEntry(createGradeEntryDto);
  }

  async createGrade(createGradeDto: CreateGradeDto): Promise<Grade> {
    return this.gradeRepository.createGrade(createGradeDto);
  }
}
