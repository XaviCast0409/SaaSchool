import { Request, Response } from 'express';
import { recordAudit } from '../../utils/audit.util';
import {
  createCriterionSchema,
  updateCriterionSchema,
  getMatrixQuerySchema,
  batchSaveGradesSchema,
  getConclusionsQuerySchema,
  batchSaveConclusionsSchema,
  siagieSummaryQuerySchema,
  getPeriodLockQuerySchema,
  togglePeriodLockSchema,
  syncHomeworkToMatrixSchema,
  createGradeSchema,
  createGradeEntrySchema,
  gradingScaleSchema,
  gradingScaleQuerySchema,
} from './grade.schema';
import type { GradeService } from './grade.service';
import type { EducationLevel } from '@prisma/client';
import { AppError } from '../../core/errors/app-error';

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

  // ============================================================================
  // Matriz de Calificaciones (Cubicol / Excel)
  // ============================================================================

  getMatrixData = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const userContext = {
      userId: request.user!.userId,
      schoolId,
      role: request.user!.role,
    };
    const { courseAssignmentId, periodNumber } = getMatrixQuerySchema.parse(request.query);
    const matrix = await this.gradeService.getMatrixData(
      schoolId,
      courseAssignmentId,
      periodNumber,
      userContext,
    );
    response.status(200).json({ status: 'success', data: matrix });
  };

  saveBatchGrades = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const userContext = {
      userId: request.user!.userId,
      schoolId,
      role: request.user!.role,
    };
    const dto = batchSaveGradesSchema.parse(request.body);
    const result = await this.gradeService.saveBatchGrades(schoolId, dto, userContext);
    recordAudit(request, {
      action: 'GRADES_SAVE_BATCH_GRADES',
      entity: 'Grades',
      entityId: dto.courseAssignmentId ?? null,
      after: request.body,
    });
    response.status(200).json({ status: 'success', data: result });
  };

  // ============================================================================
  // Conclusiones Descriptivas por Competencia
  // ============================================================================

  getConclusions = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const userContext = {
      userId: request.user!.userId,
      schoolId,
      role: request.user!.role,
    };
    const query = getConclusionsQuerySchema.parse(request.query);
    const data = await this.gradeService.getConclusions(schoolId, query, userContext);
    response.status(200).json({ status: 'success', data });
  };

  saveBatchConclusions = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const userContext = {
      userId: request.user!.userId,
      schoolId,
      role: request.user!.role,
    };
    const dto = batchSaveConclusionsSchema.parse(request.body);
    const result = await this.gradeService.saveBatchConclusions(schoolId, dto, userContext);
    recordAudit(request, {
      action: 'GRADES_SAVE_BATCH_CONCLUSIONS',
      entity: 'Grades',
      entityId: dto.courseAssignmentId ?? null,
      after: request.body,
    });
    response.status(200).json({ status: 'success', data: result });
  };

  // ============================================================================
  // Libreta de Notas / Report Card
  // ============================================================================

  getReportCard = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const enrollmentId = request.params.enrollmentId as string;
    const userContext = {
      userId: request.user!.userId,
      role: request.user!.role,
      studentId: request.user!.studentId,
    };
    const reportCard = await this.gradeService.getReportCard(schoolId, enrollmentId, userContext);
    response.status(200).json({ status: 'success', data: reportCard });
  };

  // ============================================================================
  // Auditoría y Validación SIAGIE
  // ============================================================================

  getSiagieSummary = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const { classroomId, periodNumber, calculationMode } = siagieSummaryQuerySchema.parse(request.query);
    if (!classroomId) {
      throw new AppError('El ID del aula es obligatorio para el consolidado SIAGIE.', 400);
    }
    const summary = await this.gradeService.getSiagieSummary(
      schoolId,
      classroomId,
      periodNumber,
      calculationMode,
    );
    response.status(200).json({ status: 'success', data: summary });
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

  // ============================================================================
  // Cierre y Bloqueo de Periodos / Actas (Dirección)
  // ============================================================================

  getPeriodLock = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const { periodNumber, classroomId } = getPeriodLockQuerySchema.parse(request.query);
    const lockStatus = await this.gradeService.getPeriodLockStatus(schoolId, periodNumber, classroomId);
    response.status(200).json({ status: 'success', data: lockStatus });
  };

  togglePeriodLock = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const userContext = {
      userId: request.user!.userId,
      schoolId,
      role: request.user!.role,
    };
    const dto = togglePeriodLockSchema.parse(request.body);
    const lock = await this.gradeService.togglePeriodLock(schoolId, dto, userContext);
    recordAudit(request, {
      action: 'GRADING_PERIOD_LOCK_TOGGLED',
      entity: 'GradingPeriodLock',
      entityId: null,
      after: request.body,
    });
    response.status(200).json({
      status: 'success',
      data: lock,
      message: dto.isLocked
        ? `Se ha cerrado y bloqueado el ${dto.periodNumber}° Bimestre correctamente.`
        : `Se ha reabierto el ${dto.periodNumber}° Bimestre para modificaciones.`,
    });
  };

  // ============================================================================
  // Métodos Legacy
  // ============================================================================

  getByEnrollment = async (request: Request, response: Response): Promise<void> => {
    const schoolId = request.user!.schoolId;
    const enrollmentId = request.params.enrollmentId as string;
    const userContext = {
      userId: request.user!.userId,
      schoolId,
      role: request.user!.role,
    };
    const grades = await this.gradeService.getGradesByEnrollment(enrollmentId, schoolId, userContext);
    response.status(200).json({ status: 'success', data: grades });
  };

  createEntry = async (request: Request, response: Response): Promise<void> => {
    const userContext = {
      userId: request.user!.userId,
      schoolId: request.user!.schoolId,
      role: request.user!.role,
    };
    const createGradeEntryDto = createGradeEntrySchema.parse(request.body);
    const entry = await this.gradeService.createGradeEntry(createGradeEntryDto, userContext);
    recordAudit(request, {
      action: 'GRADES_CREATE_ENTRY',
      entity: 'Grades',
      entityId: (createGradeEntryDto as any)?.courseAssignmentId ?? null,
      after: request.body,
    });
    response.status(201).json({ status: 'success', data: entry });
  };

  createGrade = async (request: Request, response: Response): Promise<void> => {
    const userContext = {
      userId: request.user!.userId,
      schoolId: request.user!.schoolId,
      role: request.user!.role,
    };
    const createGradeDto = createGradeSchema.parse(request.body);
    const grade = await this.gradeService.createGrade(createGradeDto, userContext);
    recordAudit(request, {
      action: 'GRADES_CREATE_GRADE',
      entity: 'Grades',
      entityId: (createGradeDto as any)?.courseAssignmentId ?? null,
      after: request.body,
    });
    response.status(201).json({ status: 'success', data: grade });
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
