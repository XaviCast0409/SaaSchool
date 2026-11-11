import type { GradeRepository } from './grade.repository';
import { clearThresholds } from '../academic/academic.context';
import { ResultsService } from '../academic/results.service';
import type {
  CreateCriterionDto,
  UpdateCriterionDto,
  SyncHomeworkToMatrixDto,
} from './grade.schema';
import type { EducationLevel, EvaluationCriterion } from '@prisma/client';

export interface UserContext {
  userId: string;
  schoolId: string;
  role: string;
}

export class GradeService {
  constructor(private readonly gradeRepository: GradeRepository) {}

  // ============================================================================
  // Criterios / Rubros Evaluativos
  // ============================================================================

  async getCriteria(schoolId: string, level?: EducationLevel): Promise<EvaluationCriterion[]> {
    return this.gradeRepository.findCriteria(schoolId, level);
  }

  async createCriterion(schoolId: string, dto: CreateCriterionDto): Promise<EvaluationCriterion> {
    return this.gradeRepository.createCriterion(schoolId, dto);
  }

  async updateCriterion(
    schoolId: string,
    id: string,
    dto: UpdateCriterionDto,
  ): Promise<EvaluationCriterion> {
    return this.gradeRepository.updateCriterion(schoolId, id, dto);
  }

  async deleteCriterion(schoolId: string, id: string): Promise<void> {
    return this.gradeRepository.deleteCriterion(schoolId, id);
  }

  // ============================================================================
  // Sincronización de Tareas LMS hacia la Matriz de Notas
  // ============================================================================

  async syncHomeworkToMatrix(
    schoolId: string,
    userContext: UserContext,
    dto: SyncHomeworkToMatrixDto,
  ) {
    const isTeacher = userContext.role === 'TEACHER';
    return this.gradeRepository.syncHomeworkToMatrix(
      schoolId,
      dto,
      isTeacher ? userContext.userId : undefined,
    );
  }

  async getGradingScale(schoolId: string, level: EducationLevel) {
    return this.gradeRepository.getLetterThresholds(schoolId, level);
  }

  async updateGradingScale(schoolId: string, level: EducationLevel, thresholds: { AD: number; A: number; B: number }) {
    await this.gradeRepository.upsertGradingScale(schoolId, level, thresholds);
    clearThresholds(schoolId);
    await new ResultsService().recomputeSchoolLevel(schoolId, level);
    return this.gradeRepository.getLetterThresholds(schoolId, level);
  }
}
