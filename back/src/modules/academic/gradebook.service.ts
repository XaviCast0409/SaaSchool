import { prisma } from '../../config/prisma';
import { AppError } from '../../core/errors/app-error';
import { CONCLUSION_MAX_LENGTH, isResultLetter, sanitizeConclusion, type ResultLetter } from './grade-engine';
import {
  assertPeriod, periodCount, fullNameOf, getThresholds, isAdmin, loadAssignmentForUser, shortNameOf, sortCompetences, type AcademicUser,
} from './academic.context';
import { PeriodService } from './period.service';
import { ResultsService } from './results.service';

export interface ScoreItem {
  enrollmentId: string;
  competenceId: string;
  criterionId: string;
  numericScore: number | null;
  literalScore: 'AD' | 'A' | 'B' | 'C' | 'EXO' | null;
}

type LoadedAssignment = Awaited<ReturnType<typeof loadAssignmentForUser>>;

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

  private async activeEnrollmentIds(schoolId: string, a: LoadedAssignment): Promise<Set<string>> {
    const rows = await prisma.enrollment.findMany({
      where: { schoolId, classroomId: a.classroomId, academicYearId: a.academicYearId, enrollmentState: 'REGISTERED' },
      select: { id: true },
    });
    return new Set(rows.map((r) => r.id));
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
          id: true, enrollmentState: true,
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
        area: { id: a.area.id, name: a.area.name, kind: a.area.kind, officialAreaCode: a.area.officialAreaCode },
        teacher: a.teacher,
      },
      periodNumber,
      periodCount: a.academicYear.periodType === 'TRIMESTER' ? 3 : 4,
      periodStatus: status,
      canEdit: isAdmin(user) || (user.role === 'TEACHER' && status === 'OPEN' && a.academicYear.isActive),
      // La Dirección nunca queda bloqueada; el motivo es opcional y solo se guarda en la bitácora
      requiresReason: false,
      isCorrection: isAdmin(user) && (status !== 'OPEN' || !a.academicYear.isActive),
      yearIsActive: a.academicYear.isActive,
      competences: competences.map((c) => ({ id: c.id, cnebNumber: c.cnebNumber, name: c.name, shortName: shortNameOf(c) })),
      criteria,
      students: enrollments.map((e) => ({
        enrollmentId: e.id, state: e.enrollmentState, fullName: fullNameOf(e.student), studentCode: e.student.studentCode, documentId: e.student.documentId,
      })),
      scores,
      results,
      conclusions,
      conclusionMaxLength: CONCLUSION_MAX_LENGTH,
      thresholds,
    };
  }

  async saveScores(schoolId: string, user: AcademicUser, assignmentId: string, periodNumber: number, items: ScoreItem[]) {
    const a = await loadAssignmentForUser(schoolId, user, assignmentId, { write: true });
    const { correction } = await this.assertEditable(user, a, periodNumber);
    if (items.length === 0) return { saved: 0, results: [], correction };
    const compIds = new Set(a.area.competences.map((c) => c.id));
    const critIds = new Set((await this.getCourseCriteria(schoolId, a)).map((c) => c.id));
    const enrollmentIds = await this.activeEnrollmentIds(schoolId, a);
    for (const it of items) {
      if (!compIds.has(it.competenceId)) throw new AppError('Hay notas para competencias que no pertenecen a este curso.', 400);
      if (!critIds.has(it.criterionId)) throw new AppError('Hay notas para criterios que no se usan en este curso.', 400);
      if (!enrollmentIds.has(it.enrollmentId)) throw new AppError('Hay notas para estudiantes que no están matriculados en esta aula.', 400);
      if (it.numericScore !== null && (it.numericScore < 0 || it.numericScore > 20)) throw new AppError('Las notas numéricas van de 0 a 20.', 400);
    }
    await prisma.$transaction(
      items.map((it) => {
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
    );
    const pairs = [...new Map(items.map((i) => [`${i.enrollmentId}|${i.competenceId}`, { enrollmentId: i.enrollmentId, competenceId: i.competenceId }])).values()];
    const results = await this.results.recompute(schoolId, a.id, periodNumber, pairs);
    return { saved: items.length, results, correction };
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
    const result = await this.applyFinalLetter(schoolId, user, a, periodNumber, input);
    return { result, correction };
  }

  private async applyFinalLetter(
    schoolId: string,
    user: AcademicUser,
    a: LoadedAssignment,
    periodNumber: number,
    input: { enrollmentId: string; competenceId: string; finalLetter: ResultLetter | null },
  ) {
    if (!a.area.competences.some((c) => c.id === input.competenceId)) throw new AppError('La competencia no pertenece a este curso.', 400);
    if (!(await this.activeEnrollmentIds(schoolId, a)).has(input.enrollmentId)) throw new AppError('El estudiante no está matriculado en esta aula.', 400);
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
  ) {
    const a = await loadAssignmentForUser(schoolId, user, assignmentId, { write: true });
    const { correction } = await this.assertEditable(user, a, periodNumber);
    const compIds = new Set(a.area.competences.map((c) => c.id));
    const enrollmentIds = await this.activeEnrollmentIds(schoolId, a);
    for (const it of items) {
      if (!compIds.has(it.competenceId)) throw new AppError('La competencia no pertenece a este curso.', 400);
      if (!enrollmentIds.has(it.enrollmentId)) throw new AppError('El estudiante no está matriculado en esta aula.', 400);
    }
    await prisma.$transaction(
      items.map((it) => {
        const key = { enrollmentId: it.enrollmentId, courseAssignmentId: a.id, competenceId: it.competenceId, periodNumber };
        const text = sanitizeConclusion(it.conclusion);
        if (!text) return prisma.competenceConclusion.deleteMany({ where: key });
        return prisma.competenceConclusion.upsert({
          where: { enrollmentId_courseAssignmentId_competenceId_periodNumber: key },
          update: { conclusion: text },
          create: { schoolId, ...key, conclusion: text },
        });
      }),
    );
    return { saved: items.length, correction };
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

