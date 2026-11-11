import { Request, Response } from 'express';
import { recordAudit } from '../../utils/audit.util';
import {
  createCriterionSchema,
  updateCriterionSchema,
  syncHomeworkToMatrixSchema,
  gradingScaleSchema,
  gradingScaleQuerySchema,
} from './grade.schema';
import type { GradeService } from './grade.service';
import type { EducationLevel } from '@prisma/client';

export class GradeController {
  constructor(private readonly gradeService: GradeService) {}

  // ============================================================================
  // Criterios Evaluativos (Configuración del Colegio)
  // ============================================================================

  getCriteria = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const level = request.query.level as EducationLevel | undefined;
    const criteria = await this.gradeService.getCriteria(schoolId, level);
    response.status(200).json({ status: 'success', data: criteria });
  };

  createCriterion = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const dto = createCriterionSchema.parse(request.body);
    const criterion = await this.gradeService.createCriterion(schoolId, dto);
    recordAudit(request, {
      action: 'GRADES_CREATE_CRITERION',
      entity: 'Grades',
      entityId: criterion.id,
      after: request.body,
    });
    response.status(201).json({ status: 'success', data: criterion });
  };

  updateCriterion = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const id = request.params.id as string;
    const dto = updateCriterionSchema.parse(request.body);
    const updated = await this.gradeService.updateCriterion(schoolId, id, dto);
    recordAudit(request, {
      action: 'GRADES_UPDATE_CRITERION',
      entity: 'Grades',
      entityId: id,
      after: request.body,
    });
    response.status(200).json({ status: 'success', data: updated });
  };

  deleteCriterion = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const id = request.params.id as string;
    await this.gradeService.deleteCriterion(schoolId, id);
    recordAudit(request, {
      action: 'GRADES_DELETE_CRITERION',
      entity: 'Grades',
      entityId: id,
      after: null,
    });
    response.status(200).json({ status: 'success', message: 'Criterio desactivado correctamente.' });
  };

  syncHomeworkToMatrix = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const dto = syncHomeworkToMatrixSchema.parse(request.body);
    const userContext = {
      userId: request.user!.userId,
      schoolId,
      role: request.user!.role,
    };
    const result = await this.gradeService.syncHomeworkToMatrix(schoolId, userContext, dto);
    recordAudit(request, {
      action: 'GRADES_SYNC_HOMEWORK_TO_MATRIX',
      entity: 'Grades',
      entityId: dto.courseAssignmentId ?? null,
      after: request.body,
    });
    response.status(200).json({
      status: 'success',
      data: result,
      message: `Se sincronizaron las notas de ${result.updatedStudentsCount} alumno(s) desde el Aula Virtual.`,
    });
  };

  getGradingScale = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const { level } = gradingScaleQuerySchema.parse(request.query);
    const data = await this.gradeService.getGradingScale(schoolId, level as EducationLevel);
    response.status(200).json({ status: 'success', data });
  };

  updateGradingScale = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const { level, AD, A, B } = gradingScaleSchema.parse(request.body);
    const data = await this.gradeService.updateGradingScale(schoolId, level as EducationLevel, { AD, A, B });
    recordAudit(request, {
      action: 'GRADING_SCALE_UPDATED',
      entity: 'GradingScale',
      entityId: null,
      after: request.body,
    });
    response.status(200).json({ status: 'success', data });
  };
}
