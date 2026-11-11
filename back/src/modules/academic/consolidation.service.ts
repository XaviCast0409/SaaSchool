import type { EducationLevel } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../core/errors/app-error';
import { evaluateFinalSituation, type Letter, type PromotionRuleOverrides } from '../grades/promotion-rules';
import { CNEB_AREAS, CNEB_COMPETENCES, competenceName, gradeLabel } from './cneb.catalog';
import {
  computeAnnual, consolidateOfficialCompetence, isLetter, isResultLetter, needsConclusion, sanitizeConclusion,
  type AnnualMode, type ResultLetter,
} from './grade-engine';
import { assertPeriod, fullNameOf, getThresholds, periodCount, resolveYear } from './academic.context';

export type ConsolidationPeriod = number | 'FINAL';

export interface ConsolidationIssue {
  type: 'COURSE_WITHOUT_TEACHER' | 'MISSING_GRADE' | 'MISSING_CONCLUSION' | 'MISSING_STUDENT_CODE';
  message: string;
  enrollmentId?: string;
  areaCode?: string;
  cnebNumber?: number;
}

export class ConsolidationService {
  async getClassroomConsolidation(schoolId: string, classroomId: string, period: ConsolidationPeriod, academicYearId?: string) {
    const year = await resolveYear(schoolId, academicYearId);
    const classroom = await prisma.classroom.findFirst({
      where: { id: classroomId, schoolId },
      include: { tutorTeacher: { select: { firstName: true, lastNamePaternal: true, lastNameMaternal: true } } },
    });
    if (!classroom) throw new AppError('Aula no encontrada.', 404);
    const level = classroom.educationLevel as EducationLevel;
    if (period !== 'FINAL') assertPeriod(year, period);
    const periods = period === 'FINAL' ? Array.from({ length: periodCount(year) }, (_, i) => i + 1) : [period];
    const thresholds = await getThresholds(schoolId, level);

    const [school, plan, assignments, enrollments] = await Promise.all([
      prisma.school.findUnique({ where: { id: schoolId }, select: { name: true, modularCode: true, documentId: true, address: true, logoUrl: true } }),
      prisma.studyPlanCourse.findMany({
        where: { academicYearId: year.id, educationLevel: level, grade: classroom.grade },
        include: { area: { select: { id: true, name: true, kind: true, officialAreaCode: true } } },
      }),
      prisma.courseAssignment.findMany({
        where: { schoolId, classroomId, academicYearId: year.id, deletedAt: null },
        include: {
          area: { include: { competences: { where: { isActive: true } } } },
          teacher: { select: { firstName: true, lastNamePaternal: true } },
        },
      }),
      prisma.enrollment.findMany({
        where: { schoolId, classroomId, academicYearId: year.id },
        include: { student: { select: { firstNames: true, lastNamePaternal: true, lastNameMaternal: true, studentCode: true, documentId: true } } },
        orderBy: [{ student: { lastNamePaternal: 'asc' } }, { student: { lastNameMaternal: 'asc' } }, { student: { firstNames: 'asc' } }],
      }),
    ]);
    const official = assignments.filter((a) => a.area.kind !== 'WORKSHOP' && a.area.officialAreaCode);
    const [results, conclusions] = await Promise.all([
      prisma.competencePeriodResult.findMany({ where: { courseAssignmentId: { in: official.map((a) => a.id) }, periodNumber: { in: periods } } }),
      prisma.competenceConclusion.findMany({ where: { courseAssignmentId: { in: official.map((a) => a.id) }, periodNumber: { in: periods } } }),
    ]);

    const planCodes = new Set(plan.filter((p) => p.area.kind !== 'WORKSHOP').map((p) => p.area.officialAreaCode));
    const areas = CNEB_AREAS[level].filter((a) => planCodes.has(a.code));
    const consolidatedAreas = areas.map((area) => {
      const tributary = official.filter((a) => a.area.officialAreaCode === area.code);
      return {
        id: area.code,
        code: area.code,
        name: area.name,
        isSubdivided: tributary.some((t) => t.area.kind === 'SUBCOURSE'),
        tributaryCourses: tributary.map((t) => t.area.name),
        competences: area.competences.map((n) => ({ id: `${area.code}_C${n}`, number: n, name: competenceName(n), shortName: CNEB_COMPETENCES[n].shortName })),
      };
    });

    const issues: ConsolidationIssue[] = [];
    for (const p of plan) {
      if (!assignments.some((a) => a.areaId === p.areaId)) {
        issues.push({ type: 'COURSE_WITHOUT_TEACHER', message: `"${p.area.name}" no tiene docente asignado en esta aula.` });
      }
    }

    const mode = (year.annualCalculationMode === 'AVERAGE' ? 'AVERAGE' : 'LAST_PERIOD') as AnnualMode;
    const students = enrollments.map((enr, idx) => {
      const fullName = fullNameOf(enr.student);
      const inactive = enr.enrollmentState !== 'REGISTERED';
      const consolidatedGrades: Record<string, { periodScore: null; letter: null; competences: Record<string, { score: number | null; letter: ResultLetter | null; conclusion: string }> }> = {};
      const areasForRules: Array<{ areaCode: string; letters: Letter[] }> = [];

      for (const area of areas) {
        const comps: Record<string, { score: number | null; letter: ResultLetter | null; conclusion: string }> = {};
        const letters: Letter[] = [];
        for (const n of area.competences) {
          const key = `${area.code}_C${n}`;
          if (inactive) { comps[key] = { score: null, letter: null, conclusion: '' }; continue; }
          const perPeriod = periods.map((p) => {
            const parts: Array<{ finalLetter: ResultLetter | null; computedScore: number | null; isOverridden: boolean; weight: number }> = [];
            const texts: string[] = [];
            for (const a of official.filter((x) => x.area.officialAreaCode === area.code)) {
              const comp = a.area.competences.find((c) => c.cnebNumber === n);
              if (!comp) continue;
              const r = results.find((x) => x.enrollmentId === enr.id && x.courseAssignmentId === a.id && x.competenceId === comp.id && x.periodNumber === p);
              parts.push({
                finalLetter: isResultLetter(r?.finalLetter) ? (r!.finalLetter as ResultLetter) : null,
                computedScore: r?.computedScore ?? null,
                isOverridden: r?.isOverridden ?? false,
                weight: comp.weight,
              });
              const c = conclusions.find((x) => x.enrollmentId === enr.id && x.courseAssignmentId === a.id && x.competenceId === comp.id && x.periodNumber === p);
              if (c?.conclusion?.trim()) texts.push(c.conclusion.trim());
            }
            const res = consolidateOfficialCompetence(parts, thresholds);
            return { ...res, conclusion: sanitizeConclusion(texts.join(' ')) };
          });
          const letter = period === 'FINAL' ? computeAnnual(perPeriod.map((x) => x.letter), mode, thresholds) : perPeriod[0].letter;
          const score = period === 'FINAL' ? null : perPeriod[0].score;
          const conclusion = perPeriod[perPeriod.length - 1]?.conclusion ?? '';
          comps[key] = { score, letter, conclusion };
          if (isLetter(letter)) letters.push(letter);
          if (letter === null) {
            issues.push({ type: 'MISSING_GRADE', enrollmentId: enr.id, areaCode: area.code, cnebNumber: n, message: `${fullName}: falta el calificativo de "${CNEB_COMPETENCES[n].shortName}" (${area.name}).` });
          } else if (needsConclusion(letter) && !conclusion) {
            issues.push({ type: 'MISSING_CONCLUSION', enrollmentId: enr.id, areaCode: area.code, cnebNumber: n, message: `${fullName}: falta la conclusión descriptiva de "${CNEB_COMPETENCES[n].shortName}" (${area.name}, ${letter}).` });
          }
        }
        consolidatedGrades[area.code] = { periodScore: null, letter: null, competences: comps };
        areasForRules.push({ areaCode: area.code, letters });
      }
      if (!inactive && !/^\d{14}$/.test(enr.student.studentCode ?? '')) {
        issues.push({ type: 'MISSING_STUDENT_CODE', enrollmentId: enr.id, message: `${fullName}: no tiene código de estudiante SIAGIE válido (14 dígitos).` });
      }
      const evaluation = period === 'FINAL'
        ? evaluateFinalSituation(
            { educationLevel: level, grade: classroom.grade, enrollmentState: enr.enrollmentState, areas: areasForRules },
            (year.promotionRulesConfig ?? null) as PromotionRuleOverrides | null,
          )
        : null;
      return {
        enrollmentId: enr.id,
        enrollmentState: enr.enrollmentState,
        orderIndex: idx + 1,
        documentId: enr.student.documentId ?? '',
        studentCode: enr.student.studentCode,
        fullName,
        courseGrades: {},
        consolidatedGrades,
        generalScore: null,
        generalLetter: null,
        finalSituation: evaluation?.situation ?? null,
        failedAreasCount: evaluation?.failedAreasCount ?? 0,
        finalSituationIsProvisional: true,
      };
    });

    const tutor = classroom.tutorTeacher;
    return {
      school,
      classroom: {
        id: classroom.id, educationLevel: level, grade: classroom.grade, section: classroom.section,
        label: `${gradeLabel(level, classroom.grade)} "${classroom.section}"`,
        tutor: tutor ? `${tutor.firstName} ${tutor.lastNamePaternal} ${tutor.lastNameMaternal ?? ''}`.trim() : null,
      },
      academicYear: { id: year.id, year: year.year, annualCalculationMode: mode },
      period,
      matrix: { courses: [], students, consolidatedAreas },
      issues,
      summary: {
        totalStudents: students.filter((s) => s.enrollmentState === 'REGISTERED').length,
        missingGrades: issues.filter((i) => i.type === 'MISSING_GRADE').length,
        missingConclusions: issues.filter((i) => i.type === 'MISSING_CONCLUSION').length,
        missingStudentCodes: issues.filter((i) => i.type === 'MISSING_STUDENT_CODE').length,
        coursesWithoutTeacher: issues.filter((i) => i.type === 'COURSE_WITHOUT_TEACHER').length,
      },
    };
  }
}

