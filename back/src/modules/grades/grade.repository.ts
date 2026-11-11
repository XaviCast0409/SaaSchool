import { prisma } from '../../config/prisma';
import type { EducationLevel, EvaluationCriterion } from '@prisma/client';
import type {
  CreateCriterionDto,
  UpdateCriterionDto,
  SyncHomeworkToMatrixDto,
} from './grade.schema';
import { AppError } from '../../core/errors/app-error';
import { PeriodService } from '../academic/period.service';
import { ResultsService } from '../academic/results.service';
import { thresholdsFromGradingScale, scoreToLetter, type LetterScaleThresholds } from './letter-scale';

export class GradeRepository {
  private letterThresholdCache = new Map<string, { value: LetterScaleThresholds; expiresAt: number }>();

  async getLetterThresholds(schoolId: string, level: EducationLevel): Promise<LetterScaleThresholds> {
    const key = `${schoolId}:${level}`;
    const cached = this.letterThresholdCache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.value;
    const rows = await prisma.gradingScale.findMany({ where: { schoolId, level }, select: { letterGrade: true, minNumeric: true } });
    const value = thresholdsFromGradingScale(rows);
    this.letterThresholdCache.set(key, { value, expiresAt: Date.now() + 5 * 60 * 1000 });
    return value;
  }

  clearLetterThresholds(schoolId: string): void {
    for (const key of this.letterThresholdCache.keys()) {
      if (key.startsWith(`${schoolId}:`)) this.letterThresholdCache.delete(key);
    }
  }

  async upsertGradingScale(schoolId: string, level: EducationLevel, t: LetterScaleThresholds): Promise<void> {
    const rows = [
      { letterGrade: 'AD', minNumeric: t.AD, maxNumeric: 20 },
      { letterGrade: 'A', minNumeric: t.A, maxNumeric: t.AD - 0.01 },
      { letterGrade: 'B', minNumeric: t.B, maxNumeric: t.A - 0.01 },
      { letterGrade: 'C', minNumeric: 0, maxNumeric: t.B - 0.01 },
    ];
    await prisma.$transaction(
      rows.map((r) =>
        prisma.gradingScale.upsert({
          where: { schoolId_level_letterGrade: { schoolId, level, letterGrade: r.letterGrade } },
          update: { minNumeric: r.minNumeric, maxNumeric: r.maxNumeric },
          create: { schoolId, level, ...r },
        }),
      ),
    );
    this.clearLetterThresholds(schoolId);
  }

  // ============================================================================
  // 1. CRITERIOS / RUBROS EVALUATIVOS (Configuración del Colegio)
  // ============================================================================

  async findCriteria(schoolId: string, level?: EducationLevel): Promise<EvaluationCriterion[]> {
    const existing = await prisma.evaluationCriterion.findMany({
      where: {
        schoolId,
        isActive: true,
        ...(level ? { OR: [{ educationLevel: level }, { educationLevel: null }] } : {}),
      },
      orderBy: { order: 'asc' },
    });

    if (existing.length > 0) {
      return existing;
    }

    const anyEverCreated = await prisma.evaluationCriterion.findFirst({
      where: { schoolId },
    });
    if (anyEverCreated) {
      return [];
    }

    const defaultCriteria = [
      { name: 'Práctica Mensual', shortName: 'PM', order: 1, weight: 1.0 },
      { name: 'Examen Mensual', shortName: 'EM', order: 2, weight: 1.0 },
      { name: 'Revisión de Cuaderno / Tareas', shortName: 'RC', order: 3, weight: 1.0 },
      { name: 'Examen Bimestral', shortName: 'EB', order: 4, weight: 2.0 },
    ];

    await prisma.evaluationCriterion.createMany({
      data: defaultCriteria.map((c) => ({
        ...c,
        schoolId,
        isActive: true,
      })),
    });

    return prisma.evaluationCriterion.findMany({
      where: { schoolId, isActive: true },
      orderBy: { order: 'asc' },
    });
  }

  async createCriterion(schoolId: string, data: CreateCriterionDto): Promise<EvaluationCriterion> {
    return prisma.evaluationCriterion.create({
      data: {
        schoolId,
        name: data.name,
        shortName: data.shortName,
        weight: data.weight,
        order: data.order,
        educationLevel: data.educationLevel ?? null,
      },
    });
  }

  async updateCriterion(
    schoolId: string,
    id: string,
    data: UpdateCriterionDto,
  ): Promise<EvaluationCriterion> {
    const criterion = await prisma.evaluationCriterion.findFirst({
      where: { id, schoolId },
    });

    if (!criterion) {
      throw new AppError('Criterio de evaluación no encontrado.', 404);
    }

    return prisma.evaluationCriterion.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.shortName !== undefined ? { shortName: data.shortName } : {}),
        ...(data.weight !== undefined ? { weight: data.weight } : {}),
        ...(data.order !== undefined ? { order: data.order } : {}),
        ...(data.educationLevel !== undefined ? { educationLevel: data.educationLevel } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    });
  }

  async deleteCriterion(schoolId: string, id: string): Promise<void> {
    const criterion = await prisma.evaluationCriterion.findFirst({
      where: { id, schoolId },
    });

    if (!criterion) {
      throw new AppError('Criterio de evaluación no encontrado.', 404);
    }

    await prisma.evaluationCriterion.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ============================================================================
  // 2. SINCRONIZACIÓN DE TAREAS HACIA MATRIZ
  // ============================================================================

  async syncHomeworkToMatrix(
    schoolId: string,
    dto: SyncHomeworkToMatrixDto,
    teacherId?: string,
  ): Promise<{ updatedStudentsCount: number; totalHomeworksFound: number }> {
    const assignment = await prisma.courseAssignment.findFirst({
      where: {
        id: dto.courseAssignmentId,
        schoolId,
        deletedAt: null,
        ...(teacherId ? { teacherId } : {}),
      },
      include: {
        area: {
          include: {
            competences: true,
          },
        },
        classroom: true,
      },
    });

    if (!assignment) {
      throw new AppError('Asignación de curso no encontrada o no tienes permisos.', 404);
    }

    const classroomEnrollments = await prisma.enrollment.findMany({
      where: {
        schoolId,
        classroomId: assignment.classroomId,
        academicYearId: assignment.academicYearId,
        isActive: true,
        enrollmentState: 'REGISTERED',
      },
      select: { id: true },
    });
    const validEnrollmentIds = new Set(classroomEnrollments.map((e) => e.id));

    if (teacherId) {
      const status = await new PeriodService().getEffectiveStatus(assignment.academicYearId!, dto.periodNumber, assignment.classroomId);
      if (status !== 'OPEN') throw new AppError('El periodo no está abierto para registrar notas.', 403);
    }

    let effectiveCriterionId = dto.criterionId || dto.targetCriterionId;
    if (!effectiveCriterionId) {
      const defaultCrit = await prisma.evaluationCriterion.findFirst({
        where: {
          schoolId,
          educationLevel: assignment.classroom.educationLevel,
          isActive: true,
          OR: [
            { shortName: 'TAREAS' },
            { name: { contains: 'Tarea', mode: 'insensitive' } },
            { shortName: 'PC' },
          ],
        },
      });
      effectiveCriterionId = defaultCrit?.id;
    }

    if (!effectiveCriterionId) {
      throw new AppError('No se encontró un criterio de evaluación para asociar las tareas.', 400);
    }

    const requestedCompId = dto.competenceId || dto.targetCompetenceId;
    if (requestedCompId && !assignment.area.competences.some((c) => c.id === requestedCompId && c.isActive)) {
      throw new AppError('La competencia no pertenece a este curso.', 400);
    }
    const targetCompIds: string[] = requestedCompId
      ? [requestedCompId]
      : assignment.area.competences.filter((c) => c.isActive).map((c) => c.id);

    if (targetCompIds.length === 0) {
      throw new AppError('El curso no tiene competencias configuradas para asociar la nota.', 400);
    }

    let homeworkWhere: any = {
      schoolId,
      courseAssignmentId: dto.courseAssignmentId,
      contentType: 'HOMEWORK',
      bimester: dto.periodNumber,
    };
    if (dto.homeworkId) {
      homeworkWhere = {
        schoolId,
        id: dto.homeworkId,
        courseAssignmentId: dto.courseAssignmentId,
      };
    }

    const homeworkContents = await prisma.courseContent.findMany({
      where: homeworkWhere,
      select: { id: true },
    });

    const contentIds = homeworkContents.map((c) => c.id);
    if (contentIds.length === 0) {
      return { updatedStudentsCount: 0, totalHomeworksFound: 0 };
    }

    const submissions = await prisma.homeworkSubmission.findMany({
      where: {
        courseContentId: { in: contentIds },
        numericScore: { not: null },
      },
      select: {
        enrollmentId: true,
        numericScore: true,
      },
    });

    const studentGradesMap = new Map<string, number[]>();
    submissions.forEach((sub) => {
      if (validEnrollmentIds.has(sub.enrollmentId) && sub.numericScore !== null && sub.numericScore !== undefined) {
        if (!studentGradesMap.has(sub.enrollmentId)) {
          studentGradesMap.set(sub.enrollmentId, []);
        }
        studentGradesMap.get(sub.enrollmentId)!.push(sub.numericScore);
      }
    });

    let updatedStudentsCount = 0;
    const upsertPromises: any[] = [];
    const letterThresholds = await this.getLetterThresholds(schoolId, assignment.classroom.educationLevel);

    studentGradesMap.forEach((scores, enrollmentId) => {
      if (scores.length > 0) {
        const avg = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
        const literal = scoreToLetter(avg, letterThresholds);

        for (const compId of targetCompIds) {
          upsertPromises.push(
            prisma.detailedGrade.upsert({
              where: {
                enrollmentId_courseAssignmentId_competenceId_criterionId_periodNumber: {
                  enrollmentId,
                  courseAssignmentId: dto.courseAssignmentId,
                  competenceId: compId,
                  criterionId: effectiveCriterionId!,
                  periodNumber: dto.periodNumber,
                },
              },
              update: {
                numericScore: avg,
                literalScore: literal,
                comment: `Sincronizado de ${scores.length} tarea(s) del Aula Virtual`,
              },
              create: {
                schoolId,
                enrollmentId,
                courseAssignmentId: dto.courseAssignmentId,
                competenceId: compId,
                criterionId: effectiveCriterionId!,
                periodNumber: dto.periodNumber,
                numericScore: avg,
                literalScore: literal,
                comment: `Sincronizado de ${scores.length} tarea(s) del Aula Virtual`,
              },
            }),
          );
        }
        updatedStudentsCount++;
      }
    });

    if (upsertPromises.length > 0) {
      await prisma.$transaction(upsertPromises);
    }

    await new ResultsService().recompute(schoolId, assignment.id, dto.periodNumber);

    return {
      updatedStudentsCount,
      totalHomeworksFound: contentIds.length,
    };
  }
}
