import type { EducationLevel, Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../core/errors/app-error';
import { computeCompetencePeriod, type ResultLetter } from './grade-engine';
import { getThresholds, periodCount } from './academic.context';

export interface ResultDto {
  enrollmentId: string;
  competenceId: string;
  computedScore: number | null;
  suggestedLetter: ResultLetter | null;
  finalLetter: ResultLetter | null;
  isOverridden: boolean;
}

const keyOf = (enrollmentId: string, competenceId: string) => `${enrollmentId}|${competenceId}`;

export class ResultsService {
  /** Peso efectivo de cada criterio en un curso: el del curso si existe, si no el del criterio. */
  async criterionWeights(courseAssignmentId: string): Promise<Map<string, number>> {
    const links = await prisma.courseAssignmentCriterion.findMany({
      where: { courseAssignmentId },
      include: { criterion: { select: { id: true, weight: true } } },
    });
    const map = new Map<string, number>();
    links.forEach((l) => map.set(l.criterionId, l.weight ?? l.criterion.weight ?? 1));
    if (map.size === 0) {
      const assignment = await prisma.courseAssignment.findUnique({ where: { id: courseAssignmentId }, select: { schoolId: true } });
      const criteria = await prisma.evaluationCriterion.findMany({ where: { schoolId: assignment?.schoolId }, select: { id: true, weight: true } });
      criteria.forEach((c) => map.set(c.id, c.weight ?? 1));
    }
    return map;
  }

  /** Recalcula los resultados de un curso y periodo. Conserva los ajustes manuales del docente. */
  async recompute(
    schoolId: string,
    courseAssignmentId: string,
    periodNumber: number,
    pairs?: Array<{ enrollmentId: string; competenceId: string }>,
  ): Promise<ResultDto[]> {
    const assignment = await prisma.courseAssignment.findUnique({
      where: { id: courseAssignmentId },
      select: { id: true, schoolId: true, classroom: { select: { educationLevel: true } } },
    });
    if (!assignment || assignment.schoolId !== schoolId) throw new AppError('Curso no encontrado.', 404);
    const thresholds = await getThresholds(schoolId, assignment.classroom.educationLevel as EducationLevel);
    const weights = await this.criterionWeights(courseAssignmentId);
    const pairFilter = pairs && pairs.length > 0
      ? { OR: pairs.map((p) => ({ enrollmentId: p.enrollmentId, competenceId: p.competenceId })) }
      : {};
    const where = { courseAssignmentId, periodNumber, ...pairFilter };
    const [grades, existing] = await Promise.all([
      prisma.detailedGrade.findMany({
        where,
        select: { enrollmentId: true, competenceId: true, criterionId: true, numericScore: true, literalScore: true, isExonerated: true },
      }),
      prisma.competencePeriodResult.findMany({ where }),
    ]);
    const keys = new Set<string>([
      ...grades.map((g) => keyOf(g.enrollmentId, g.competenceId)),
      ...existing.map((r) => keyOf(r.enrollmentId, r.competenceId)),
      ...(pairs ?? []).map((p) => keyOf(p.enrollmentId, p.competenceId)),
    ]);
    const ops: Prisma.PrismaPromise<unknown>[] = [];
    const out: ResultDto[] = [];
    for (const key of keys) {
      const [enrollmentId, competenceId] = key.split('|');
      const mine = grades.filter((g) => g.enrollmentId === enrollmentId && g.competenceId === competenceId);
      const { computedScore, suggestedLetter } = computeCompetencePeriod(
        mine.map((g) => ({ weight: weights.get(g.criterionId) ?? 1, numericScore: g.numericScore, literalScore: g.literalScore, isExonerated: g.isExonerated })),
        thresholds,
      );
      const prev = existing.find((r) => r.enrollmentId === enrollmentId && r.competenceId === competenceId);
      if (!prev && suggestedLetter === null) continue;
      if (prev && suggestedLetter === null && !prev.isOverridden) {
        ops.push(prisma.competencePeriodResult.delete({ where: { id: prev.id } }));
        out.push({ enrollmentId, competenceId, computedScore: null, suggestedLetter: null, finalLetter: null, isOverridden: false });
        continue;
      }
      const keepOverride = !!prev?.isOverridden && prev.finalLetter !== suggestedLetter;
      const finalLetter = (keepOverride ? prev!.finalLetter : suggestedLetter) as ResultLetter | null;
      ops.push(
        prisma.competencePeriodResult.upsert({
          where: { enrollmentId_courseAssignmentId_competenceId_periodNumber: { enrollmentId, courseAssignmentId, competenceId, periodNumber } },
          update: {
            computedScore, suggestedLetter, finalLetter, isOverridden: keepOverride,
            ...(keepOverride ? {} : { overriddenById: null, overriddenAt: null }),
          },
          create: { schoolId, enrollmentId, courseAssignmentId, competenceId, periodNumber, computedScore, suggestedLetter, finalLetter, isOverridden: false },
        }),
      );
      out.push({ enrollmentId, competenceId, computedScore, suggestedLetter, finalLetter, isOverridden: keepOverride });
    }
    if (ops.length > 0) await prisma.$transaction(ops);
    return out;
  }

  async recomputeAssignment(schoolId: string, courseAssignmentId: string): Promise<void> {
    const a = await prisma.courseAssignment.findUnique({ where: { id: courseAssignmentId }, include: { academicYear: true } });
    if (!a?.academicYear) return;
    for (let p = 1; p <= periodCount(a.academicYear); p++) await this.recompute(schoolId, courseAssignmentId, p);
  }

  /** Recalcula todo un nivel del año activo (por ejemplo, al cambiar la escala del colegio). */
  async recomputeSchoolLevel(schoolId: string, level: EducationLevel): Promise<number> {
    const year = await prisma.academicYear.findFirst({ where: { schoolId, isActive: true } });
    if (!year) return 0;
    const assignments = await prisma.courseAssignment.findMany({
      where: { schoolId, academicYearId: year.id, deletedAt: null, classroom: { educationLevel: level } },
      select: { id: true },
    });
    for (const a of assignments) await this.recomputeAssignment(schoolId, a.id);
    return assignments.length;
  }
}

