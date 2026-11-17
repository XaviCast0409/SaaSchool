import type { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../core/errors/app-error';
import { CONCLUSION_MAX_LENGTH, CONCLUSION_MIN_LENGTH, isResultLetter, sanitizeConclusion, type ResultLetter } from './grade-engine';
import {
  assertPeriod, periodCount, periodName, fullNameOf, getThresholds, isAdmin, loadAssignmentForUser, shortNameOf, sortCompetences, type AcademicUser,
} from './academic.context';
import { PeriodService } from './period.service';
import { ResultsService } from './results.service';
import { countsInPeriod, lastStudyDay } from '../enrollments/withdrawal.rules';

export interface ScoreItem {
  enrollmentId: string;
  competenceId: string;
  criterionId: string;
  numericScore: number | null;
  literalScore: 'AD' | 'A' | 'B' | 'C' | 'EXO' | null;
}

type LoadedAssignment = Awaited<ReturnType<typeof loadAssignmentForUser>>;

/** Una nota que realmente cambió: valor anterior → valor nuevo (null = no había / se borró). */
export interface ScoreChange {
  enrollmentId: string;
  competenceId: string;
  criterionId: string;
  before: number | string | null;
  after: number | string | null;
}

export interface ConclusionChange {
  enrollmentId: string;
  competenceId: string;
  before: string | null;
  after: string | null;
}

/**
 * Arma la fila de bitácora a partir del resumen del cambio. Se escribe en la MISMA transacción que las
 * notas: no puede quedar una nota cambiada sin su registro (ni un registro de algo que no se guardó).
 */
export type AuditBuilder<T> = (summary: T) => Prisma.AuditLogUncheckedCreateInput | null;

const scoreValue = (numericScore: number | null, literalScore: string | null): number | string | null =>
  numericScore ?? literalScore ?? null;
const clip = (text: string | null, max = 300): string | null => (text && text.length > max ? `${text.slice(0, max)}…` : text);

export class GradebookService {
  private readonly periods = new PeriodService();
  private readonly results = new ResultsService();

  async getCourseCriteria(schoolId: string, assignment: LoadedAssignment) {
    const links = await prisma.courseAssignmentCriterion.findMany({
      where: { courseAssignmentId: assignment.id, criterion: { isActive: true } },
      include: { criterion: true },
      orderBy: { criterion: { order: 'asc' } },
    });
    if (links.length > 0) {
      return links.map((l) => ({ id: l.criterion.id, name: l.criterion.name, shortName: l.criterion.shortName, weight: l.weight ?? l.criterion.weight, isCustom: true }));
    }
    const criteria = await prisma.evaluationCriterion.findMany({
      where: { schoolId, isActive: true, OR: [{ educationLevel: null }, { educationLevel: assignment.classroom.educationLevel }] },
      orderBy: { order: 'asc' },
    });
    return criteria.map((c) => ({ id: c.id, name: c.name, shortName: c.shortName, weight: c.weight, isCustom: false }));
  }

  /** Matrículas que reciben notas en el periodo: matriculados y retirados que completaron ese periodo. */
  private async activeEnrollmentIds(schoolId: string, a: LoadedAssignment, periodNumber: number): Promise<Set<string>> {
    const rows = await prisma.enrollment.findMany({
      where: { schoolId, classroomId: a.classroomId, academicYearId: a.academicYearId },
      select: { id: true, enrollmentState: true, withdrawalDate: true },
    });
    return new Set(rows.filter((r) => countsInPeriod(r, a.academicYear, periodNumber)).map((r) => r.id));
  }

  /**
   * Docentes: solo editan periodos abiertos del año activo.
   * Dirección (SCHOOL_ADMIN / SUPER_ADMIN): puede registrar o cambiar notas en cualquier momento,
   * incluso con el periodo cerrado o el año inactivo. Esos cambios se marcan como corrección en la bitácora.
   */
  private async assertEditable(user: AcademicUser, a: LoadedAssignment, periodNumber: number): Promise<{ correction: boolean }> {
    assertPeriod(a.academicYear, periodNumber);
    const status = await this.periods.getEffectiveStatus(a.academicYearId, periodNumber, a.classroomId);
    const isLocked = status !== 'OPEN' || !a.academicYear.isActive;
    if (!isLocked) return { correction: false };
    if (isAdmin(user)) return { correction: true };
    if (!a.academicYear.isActive) throw new AppError('Este año lectivo ya no está activo: sus notas son de solo lectura.', 403);
    throw new AppError(
      `El periodo está ${status === 'REVIEW' ? 'en revisión' : 'cerrado'}. Pide a la Dirección que lo reabra o que haga la corrección.`,
      403,
    );
  }

  async getGradebook(schoolId: string, user: AcademicUser, assignmentId: string, periodNumber: number) {
    const a = await loadAssignmentForUser(schoolId, user, assignmentId);
    assertPeriod(a.academicYear, periodNumber);
    const level = a.classroom.educationLevel;
    const competences = sortCompetences(level, a.area.officialAreaCode, a.area.competences);
    const [enrollments, criteria, scores, results, conclusions, status, thresholds] = await Promise.all([
      prisma.enrollment.findMany({
        where: {
          schoolId, classroomId: a.classroomId, academicYearId: a.academicYearId,
        },
        select: {
          id: true, enrollmentState: true, withdrawalDate: true,
          student: { select: { id: true, firstNames: true, lastNamePaternal: true, lastNameMaternal: true, studentCode: true, documentId: true } },
        },
        orderBy: [{ student: { lastNamePaternal: 'asc' } }, { student: { lastNameMaternal: 'asc' } }, { student: { firstNames: 'asc' } }],
      }),
      this.getCourseCriteria(schoolId, a),
      prisma.detailedGrade.findMany({
        where: { courseAssignmentId: a.id, periodNumber },
        select: { enrollmentId: true, competenceId: true, criterionId: true, numericScore: true, literalScore: true, isExonerated: true },
      }),
      prisma.competencePeriodResult.findMany({
        where: { courseAssignmentId: a.id, periodNumber },
        select: { enrollmentId: true, competenceId: true, computedScore: true, suggestedLetter: true, finalLetter: true, isOverridden: true },
      }),
      prisma.competenceConclusion.findMany({
        where: { courseAssignmentId: a.id, periodNumber },
        select: { enrollmentId: true, competenceId: true, conclusion: true },
      }),
      this.periods.getEffectiveStatus(a.academicYearId, periodNumber, a.classroomId),
      getThresholds(schoolId, level),
    ]);
    return {
      assignment: {
        id: a.id,
        academicYearId: a.academicYearId,
        classroom: { id: a.classroom.id, educationLevel: level, grade: a.classroom.grade, section: a.classroom.section },
        area: { id: a.area.id, name: a.area.name, kind: a.area.kind, officialAreaCode: a.area.officialAreaCode, catalogKey: a.area.catalogKey },
        teacher: a.teacher,
      },
      periodNumber,
      periodCount: periodCount(a.academicYear),
      // Nombres de los periodos del año del curso ("1.° bimestre"...) para el selector
      periodNames: Array.from({ length: periodCount(a.academicYear) }, (_, i) => periodName(a.academicYear, i + 1)),
      periodStatus: status,
      canEdit: isAdmin(user) || (user.role === 'TEACHER' && status === 'OPEN' && a.academicYear.isActive),
      // La Dirección nunca queda bloqueada; el motivo es opcional y solo se guarda en la bitácora
      requiresReason: false,
      isCorrection: isAdmin(user) && (status !== 'OPEN' || !a.academicYear.isActive),
      yearIsActive: a.academicYear.isActive,
      competences: competences.map((c) => ({ id: c.id, cnebNumber: c.cnebNumber, name: c.name, shortName: shortNameOf(c) })),
      criteria,
      students: enrollments.map((e) => ({
        enrollmentId: e.id, state: e.enrollmentState,
        // Retirado o trasladado: se califica solo en los periodos que completó antes de irse
        activeInPeriod: countsInPeriod(e, a.academicYear, periodNumber),
        withdrawalDate: lastStudyDay(e),
        fullName: fullNameOf(e.student), studentCode: e.student.studentCode, documentId: e.student.documentId,
      })),
      scores,
      results,
      conclusions,
      conclusionMaxLength: CONCLUSION_MAX_LENGTH,
      conclusionMinLength: CONCLUSION_MIN_LENGTH,
      thresholds,
    };
  }

  async saveScores(
    schoolId: string,
    user: AcademicUser,
    assignmentId: string,
    periodNumber: number,
    items: ScoreItem[],
    audit?: AuditBuilder<{ correction: boolean; changes: ScoreChange[] }>,
  ) {
    const a = await loadAssignmentForUser(schoolId, user, assignmentId, { write: true });
    const { correction } = await this.assertEditable(user, a, periodNumber);
    if (items.length === 0) return { saved: 0, results: [], correction, changes: [] as ScoreChange[] };
    const compIds = new Set(a.area.competences.map((c) => c.id));
    const critIds = new Set((await this.getCourseCriteria(schoolId, a)).map((c) => c.id));
    const enrollmentIds = await this.activeEnrollmentIds(schoolId, a, periodNumber);
    for (const it of items) {
      if (!compIds.has(it.competenceId)) throw new AppError('Hay notas para competencias que no pertenecen a este curso.', 400);
      if (!critIds.has(it.criterionId)) throw new AppError('Hay notas para criterios que no se usan en este curso.', 400);
      if (!enrollmentIds.has(it.enrollmentId)) throw new AppError('Hay notas para estudiantes que no están matriculados en esta aula o que se retiraron antes de terminar este periodo.', 400);
      if (it.numericScore !== null && (it.numericScore < 0 || it.numericScore > 20)) throw new AppError('Las notas numéricas van de 0 a 20.', 400);
    }
    // Valores anteriores, para que la bitácora diga "de B a C" y no solo "registró notas"
    const previous = await prisma.detailedGrade.findMany({
      where: {
        courseAssignmentId: a.id,
        periodNumber,
        enrollmentId: { in: [...new Set(items.map((i) => i.enrollmentId))] },
        competenceId: { in: [...new Set(items.map((i) => i.competenceId))] },
        criterionId: { in: [...new Set(items.map((i) => i.criterionId))] },
      },
      select: { enrollmentId: true, competenceId: true, criterionId: true, numericScore: true, literalScore: true },
    });
    const prevByKey = new Map(previous.map((g) => [`${g.enrollmentId}|${g.competenceId}|${g.criterionId}`, scoreValue(g.numericScore, g.literalScore)]));
    const changes: ScoreChange[] = [];
    for (const it of items) {
      const before = prevByKey.get(`${it.enrollmentId}|${it.competenceId}|${it.criterionId}`) ?? null;
      const after = it.literalScore === 'EXO' ? 'EXO' : scoreValue(it.numericScore, it.literalScore);
      if (before !== after) changes.push({ enrollmentId: it.enrollmentId, competenceId: it.competenceId, criterionId: it.criterionId, before, after });
    }
    const auditData = changes.length > 0 ? audit?.({ correction, changes }) : null;

    await prisma.$transaction([
      ...items.map((it) => {
        const key = { enrollmentId: it.enrollmentId, courseAssignmentId: a.id, competenceId: it.competenceId, criterionId: it.criterionId, periodNumber };
        if (it.numericScore === null && it.literalScore === null) return prisma.detailedGrade.deleteMany({ where: key });
        const isExo = it.literalScore === 'EXO';
        const data = { numericScore: isExo ? null : it.numericScore, literalScore: it.literalScore, isExonerated: isExo };
        return prisma.detailedGrade.upsert({
          where: { enrollmentId_courseAssignmentId_competenceId_criterionId_periodNumber: key },
          update: data,
          create: { schoolId, ...key, ...data },
        });
      }),
      ...(auditData ? [prisma.auditLog.create({ data: auditData })] : []),
    ]);
    const pairs = [...new Map(items.map((i) => [`${i.enrollmentId}|${i.competenceId}`, { enrollmentId: i.enrollmentId, competenceId: i.competenceId }])).values()];
    const results = await this.results.recompute(schoolId, a.id, periodNumber, pairs);
    return { saved: items.length, results, correction, changes };
  }

  async setFinalLetter(
    schoolId: string,
    user: AcademicUser,
    assignmentId: string,
    periodNumber: number,
    input: { enrollmentId: string; competenceId: string; finalLetter: ResultLetter | null },
  ) {
    const a = await loadAssignmentForUser(schoolId, user, assignmentId, { write: true });
    const { correction } = await this.assertEditable(user, a, periodNumber);
    const before = await prisma.competencePeriodResult.findUnique({
      where: {
        enrollmentId_courseAssignmentId_competenceId_periodNumber: {
          enrollmentId: input.enrollmentId, courseAssignmentId: a.id, competenceId: input.competenceId, periodNumber,
        },
      },
      select: { finalLetter: true },
    });
    const result = await this.applyFinalLetter(schoolId, user, a, periodNumber, input);
    return { result, correction, before: before?.finalLetter ?? null, after: result?.finalLetter ?? null };
  }

  private async applyFinalLetter(
    schoolId: string,
    user: AcademicUser,
    a: LoadedAssignment,
    periodNumber: number,
    input: { enrollmentId: string; competenceId: string; finalLetter: ResultLetter | null },
  ) {
    if (!a.area.competences.some((c) => c.id === input.competenceId)) throw new AppError('La competencia no pertenece a este curso.', 400);
    if (!(await this.activeEnrollmentIds(schoolId, a, periodNumber)).has(input.enrollmentId)) throw new AppError('El estudiante no está matriculado en esta aula o se retiró antes de terminar este periodo.', 400);
    if (input.finalLetter !== null && !isResultLetter(input.finalLetter)) throw new AppError('Calificativo no válido.', 400);
    const key = { enrollmentId: input.enrollmentId, courseAssignmentId: a.id, competenceId: input.competenceId, periodNumber };
    const prev = await prisma.competencePeriodResult.findUnique({ where: { enrollmentId_courseAssignmentId_competenceId_periodNumber: key } });
    if (input.finalLetter === null) {
      if (!prev) return null;
      if (prev.suggestedLetter === null) {
        await prisma.competencePeriodResult.delete({ where: { id: prev.id } });
        return null;
      }
      return prisma.competencePeriodResult.update({
        where: { id: prev.id },
        data: { finalLetter: prev.suggestedLetter, isOverridden: false, overriddenById: null, overriddenAt: null },
      });
    }
    const isOverridden = input.finalLetter !== (prev?.suggestedLetter ?? null);
    return prisma.competencePeriodResult.upsert({
      where: { enrollmentId_courseAssignmentId_competenceId_periodNumber: key },
      update: { finalLetter: input.finalLetter, isOverridden, overriddenById: isOverridden ? user.userId : null, overriddenAt: isOverridden ? new Date() : null },
      create: { schoolId, ...key, finalLetter: input.finalLetter, isOverridden: true, overriddenById: user.userId, overriddenAt: new Date() },
    });
  }

  async saveConclusions(
    schoolId: string,
    user: AcademicUser,
    assignmentId: string,
    periodNumber: number,
    items: Array<{ enrollmentId: string; competenceId: string; conclusion: string }>,
    audit?: AuditBuilder<{ correction: boolean; changes: ConclusionChange[] }>,
  ) {
    const a = await loadAssignmentForUser(schoolId, user, assignmentId, { write: true });
    const { correction } = await this.assertEditable(user, a, periodNumber);
    const compIds = new Set(a.area.competences.map((c) => c.id));
    const enrollmentIds = await this.activeEnrollmentIds(schoolId, a, periodNumber);
    for (const it of items) {
      if (!compIds.has(it.competenceId)) throw new AppError('La competencia no pertenece a este curso.', 400);
      if (!enrollmentIds.has(it.enrollmentId)) throw new AppError('El estudiante no está matriculado en esta aula o se retiró antes de terminar este periodo.', 400);
      const text = sanitizeConclusion(it.conclusion);
      if (text && text.length < CONCLUSION_MIN_LENGTH) {
        throw new AppError(`La conclusión debe tener al menos ${CONCLUSION_MIN_LENGTH} caracteres (el SIAGIE rechaza textos más cortos).`, 400);
      }
    }
    const previous = items.length
      ? await prisma.competenceConclusion.findMany({
          where: {
            courseAssignmentId: a.id,
            periodNumber,
            enrollmentId: { in: [...new Set(items.map((i) => i.enrollmentId))] },
            competenceId: { in: [...new Set(items.map((i) => i.competenceId))] },
          },
          select: { enrollmentId: true, competenceId: true, conclusion: true },
        })
      : [];
    const prevByKey = new Map(previous.map((c) => [`${c.enrollmentId}|${c.competenceId}`, c.conclusion]));
    const changes: ConclusionChange[] = [];
    for (const it of items) {
      const before = prevByKey.get(`${it.enrollmentId}|${it.competenceId}`) ?? null;
      const after = sanitizeConclusion(it.conclusion) || null;
      if (before !== after) changes.push({ enrollmentId: it.enrollmentId, competenceId: it.competenceId, before: clip(before), after: clip(after) });
    }
    const auditData = changes.length > 0 ? audit?.({ correction, changes }) : null;

    await prisma.$transaction([
      ...items.map((it) => {
        const key = { enrollmentId: it.enrollmentId, courseAssignmentId: a.id, competenceId: it.competenceId, periodNumber };
        const text = sanitizeConclusion(it.conclusion);
        if (!text) return prisma.competenceConclusion.deleteMany({ where: key });
        return prisma.competenceConclusion.upsert({
          where: { enrollmentId_courseAssignmentId_competenceId_periodNumber: key },
          update: { conclusion: text },
          create: { schoolId, ...key, conclusion: text },
        });
      }),
      ...(auditData ? [prisma.auditLog.create({ data: auditData })] : []),
    ]);
    return { saved: items.length, correction, changes };
  }

  async setCourseCriteria(schoolId: string, user: AcademicUser, assignmentId: string, criteria: Array<{ criterionId: string; weight?: number | null }>) {
    const a = await loadAssignmentForUser(schoolId, user, assignmentId, { write: true });
    const ids = criteria.map((c) => c.criterionId);
    if (new Set(ids).size !== ids.length) throw new AppError('Hay criterios repetidos.', 400);
    const valid = await prisma.evaluationCriterion.count({
      where: { id: { in: ids }, schoolId, isActive: true, OR: [{ educationLevel: null }, { educationLevel: a.classroom.educationLevel }] },
    });
    if (valid !== ids.length) throw new AppError('Hay criterios que no pertenecen al colegio o al nivel.', 400);
    const current = await this.getCourseCriteria(schoolId, a);
    const removed = current.filter((c) => !ids.includes(c.id)).map((c) => c.id);
    if (ids.length > 0 && removed.length > 0) {
      const used = await prisma.detailedGrade.count({ where: { courseAssignmentId: a.id, criterionId: { in: removed } } });
      if (used > 0) throw new AppError('Algún criterio que quitaste ya tiene notas en este curso. Borra esas notas primero.', 409);
    }
    await prisma.$transaction([
      prisma.courseAssignmentCriterion.deleteMany({ where: { courseAssignmentId: a.id } }),
      prisma.courseAssignmentCriterion.createMany({
        data: criteria.map((c) => ({ courseAssignmentId: a.id, criterionId: c.criterionId, weight: c.weight && c.weight > 0 ? c.weight : null })),
      }),
    ]);
    // Un docente no altera bimestres cerrados al cambiar criterios: solo se recalculan los periodos que puede editar
    for (let p = 1; p <= periodCount(a.academicYear); p++) {
      const editable = await this.assertEditable(user, a, p).then(() => true, () => false);
      if (editable) await this.results.recompute(schoolId, a.id, p);
    }
    return { saved: criteria.length };
  }
}

