import type { EducationLevel } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../core/errors/app-error';
import { scoreToLetter, type LetterScaleThresholds } from '../grades/letter-scale';
import { CNEB_AREAS, gradeLabel } from './cneb.catalog';
import { isRemainderKey } from './preuniversity.catalog';
import { isLetter, isResultLetter, LETTER_NUMERIC_VALUE, type ResultLetter } from './grade-engine';
import { fullNameOf, getThresholds, isAdmin, periodCount, periodName, type AcademicUser } from './academic.context';
import { ConsolidationService } from './consolidation.service';
import { PeriodService } from './period.service';

const SCALE_LEGEND = [
  { letter: 'AD', label: 'Logro destacado' },
  { letter: 'A', label: 'Logro esperado' },
  { letter: 'B', label: 'En proceso' },
  { letter: 'C', label: 'En inicio' },
];

interface GradeCell { score: number | null; letter: ResultLetter | null }

/** Nota de un criterio (rúbrica): numérica y literal. Si solo hay letra, la nota numérica queda vacía. */
function criterionCell(
  g: { numericScore: number | null; literalScore: string | null; isExonerated: boolean } | undefined,
  thresholds: LetterScaleThresholds,
): GradeCell {
  if (!g) return { score: null, letter: null };
  if (g.isExonerated) return { score: null, letter: 'EXO' };
  if (g.numericScore !== null) return { score: g.numericScore, letter: scoreToLetter(g.numericScore, thresholds) };
  return { score: null, letter: isResultLetter(g.literalScore) ? (g.literalScore as ResultLetter) : null };
}

export class ReportCardService {
  private readonly consolidation = new ConsolidationService();
  private readonly periods = new PeriodService();

  async getReportCard(schoolId: string, user: AcademicUser, enrollmentId: string) {
    const enr = await prisma.enrollment.findFirst({
      where: { id: enrollmentId, schoolId },
      include: {
        student: { include: { familyRelations: { select: { userId: true } } } },
        classroom: { include: { tutorTeacher: { select: { id: true, firstName: true, lastNamePaternal: true, lastNameMaternal: true } } } },
        academicYear: true,
      },
    });
    if (!enr) throw new AppError('Matrícula no encontrada.', 404);

    // Permisos
    if (user.role === 'STUDENT' && enr.studentId !== (user.studentId || user.userId)) throw new AppError('No tienes permisos para ver esta libreta.', 403);
    if (user.role === 'PARENT' && !enr.student.familyRelations.some((r) => r.userId === user.userId)) throw new AppError('No tienes permisos para ver esta libreta.', 403);
    if (user.role === 'TEACHER') {
      const teaches = await prisma.courseAssignment.count({ where: { classroomId: enr.classroomId, academicYearId: enr.academicYearId, teacherId: user.userId, deletedAt: null } });
      if (enr.classroom.tutorTeacherId !== user.userId && teaches === 0) throw new AppError('No tienes permisos para ver esta libreta.', 403);
    }
    if (!['STUDENT', 'PARENT', 'TEACHER', 'ADMINISTRATIVE'].includes(user.role) && !isAdmin(user)) throw new AppError('No tienes permisos para ver esta libreta.', 403);

    const year = enr.academicYear;
    const level = enr.classroom.educationLevel as EducationLevel;
    const total = periodCount(year);
    const statuses = await Promise.all(
      Array.from({ length: total }, (_, i) => this.periods.getEffectiveStatus(year.id, i + 1, enr.classroomId)),
    );
    const familyView = user.role === 'PARENT' || user.role === 'STUDENT';
    const visiblePeriods = statuses.map((s, i) => ({ n: i + 1, s })).filter((x) => !familyView || x.s === 'CLOSED').map((x) => x.n);
    const allClosed = statuses.every((s) => s === 'CLOSED');

    // Áreas oficiales (por periodo visible y final)
    const perPeriod = await Promise.all(visiblePeriods.map((p) => this.consolidation.getClassroomConsolidation(schoolId, enr.classroomId, p, year.id)));
    const final = allClosed || !familyView ? await this.consolidation.getClassroomConsolidation(schoolId, enr.classroomId, 'FINAL', year.id) : null;
    const base = final ?? perPeriod[0] ?? null;
    const officialAreas = (base?.matrix.consolidatedAreas ?? []).map((area) => ({
      code: area.code,
      name: area.name,
      competences: area.competences.map((c) => {
        const letters: Record<number, ResultLetter | null> = {};
        const conclusions: Record<number, string> = {};
        visiblePeriods.forEach((p, i) => {
          const st = perPeriod[i].matrix.students.find((s) => s.enrollmentId === enr.id);
          const g = st?.consolidatedGrades[area.code]?.competences[c.id];
          letters[p] = g?.letter ?? null;
          conclusions[p] = g?.conclusion ?? '';
        });
        const fst = final?.matrix.students.find((s) => s.enrollmentId === enr.id);
        return {
          number: c.number,
          name: c.name,
          shortName: c.shortName,
          letters,
          conclusions,
          finalLetter: allClosed ? fst?.consolidatedGrades[area.code]?.competences[c.id]?.letter ?? null : null,
        };
      }),
    }));
    const finalStudent = final?.matrix.students.find((s) => s.enrollmentId === enr.id);

    // Detalle interno curso por curso: competencias, criterios (rúbricas) con nota numérica y literal.
    const thresholds = await getThresholds(schoolId, level);
    const assignments = await prisma.courseAssignment.findMany({
      where: { classroomId: enr.classroomId, academicYearId: year.id, deletedAt: null },
      include: {
        area: { include: { competences: { where: { isActive: true } }, parentArea: { select: { name: true } } } },
        teacher: { select: { firstName: true, lastNamePaternal: true } },
      },
    });
    const planOrder = await prisma.studyPlanCourse.findMany({
      where: { academicYearId: year.id, educationLevel: level, grade: enr.classroom.grade },
      select: { areaId: true, order: true },
    });
    const orderOf = (areaId: string) => planOrder.find((p) => p.areaId === areaId)?.order ?? 999;
    assignments.sort((a, b) => orderOf(a.areaId) - orderOf(b.areaId) || a.area.name.localeCompare(b.area.name, 'es'));
    const [courseResults, criterionGrades] = await Promise.all([
      prisma.competencePeriodResult.findMany({
        where: { enrollmentId: enr.id, courseAssignmentId: { in: assignments.map((a) => a.id) }, periodNumber: { in: visiblePeriods } },
      }),
      prisma.detailedGrade.findMany({
        where: { enrollmentId: enr.id, courseAssignmentId: { in: assignments.map((a) => a.id) }, periodNumber: { in: visiblePeriods } },
        include: { criterion: { select: { id: true, name: true, shortName: true, order: true } } },
      }),
    ]);
    const round1 = (n: number) => Math.round(n * 10) / 10;
    const toCell = (values: number[], exoOnly: boolean): GradeCell => {
      if (values.length === 0) return { score: null, letter: exoOnly ? 'EXO' : null };
      const score = round1(values.reduce((x, y) => x + y, 0) / values.length);
      return { score, letter: scoreToLetter(score, thresholds) };
    };
    const valueOf = (cell: GradeCell) => (cell.score !== null ? cell.score : isLetter(cell.letter) ? LETTER_NUMERIC_VALUE[cell.letter] : null);

    // Cada curso: nota de cada criterio (promedio del criterio en las competencias del curso) y promedio del curso.
    const courses = assignments.map((a) => {
      const competenceIds = new Set(a.area.competences.map((c) => c.id));
      const grades = criterionGrades.filter((g) => g.courseAssignmentId === a.id && competenceIds.has(g.competenceId));
      const criteria = [...new Map(grades.map((g) => [g.criterion.id, g.criterion])).values()]
        .sort((x, y) => x.order - y.order || x.name.localeCompare(y.name, 'es'))
        .map((crit) => {
          const periods: Record<number, GradeCell> = {};
          visiblePeriods.forEach((p) => {
            const cells = grades.filter((g) => g.criterionId === crit.id && g.periodNumber === p).map((g) => criterionCell(g, thresholds));
            const values = cells.map(valueOf).filter((v): v is number => v !== null);
            periods[p] = toCell(values, cells.length > 0 && cells.every((c) => c.letter === 'EXO'));
          });
          return { id: crit.id, name: crit.name, shortName: crit.shortName, order: crit.order, periods };
        });
      // Promedio del curso: promedio de sus competencias (cada una ya pondera sus criterios).
      const average: Record<number, GradeCell> = {};
      visiblePeriods.forEach((p) => {
        const cells = a.area.competences.map((c) => {
          const r = courseResults.find((x) => x.courseAssignmentId === a.id && x.competenceId === c.id && x.periodNumber === p);
          return { score: r?.computedScore ?? null, letter: isResultLetter(r?.finalLetter) ? (r!.finalLetter as ResultLetter) : null } as GradeCell;
        });
        const values = cells.map(valueOf).filter((v): v is number => v !== null);
        average[p] = toCell(values, cells.some((c) => c.letter === 'EXO') && values.length === 0);
      });
      return {
        id: a.id,
        // El curso que guarda las competencias que ningún curso hijo evalúa se distingue del área madre.
        name: isRemainderKey(a.area.catalogKey) ? 'Otras competencias del área' : a.area.name,
        kind: a.area.kind,
        areaCode: a.area.kind === 'WORKSHOP' ? 'WORKSHOP' : a.area.officialAreaCode ?? 'OTHER',
        teacher: `${a.teacher.firstName} ${a.teacher.lastNamePaternal}`.trim(),
        criteria,
        average,
      };
    });

    // Agrupación por curso madre: si tiene hijos (Matemática → Álgebra, Aritmética…) va la madre con su
    // promedio y debajo cada hijo; si no tiene hijos, solo la madre en una fila. Cada taller va en su fila.
    const areaOrder = [...CNEB_AREAS[level].map((x) => x.code), 'OTHER'];
    const grouped = areaOrder
      .map((code) => {
        const list = courses.filter((c) => c.areaCode === code);
        if (list.length === 0) return null;
        const spec = CNEB_AREAS[level].find((x) => x.code === code);
        const average: Record<number, GradeCell> = {};
        visiblePeriods.forEach((p) => {
          const values = list.map((c) => valueOf(c.average[p])).filter((v): v is number => v !== null);
          average[p] = toCell(values, list.every((c) => c.average[p].letter === 'EXO'));
        });
        const hasChildren = list.some((c) => c.kind === 'SUBCOURSE');
        return {
          code,
          name: spec?.name ?? 'Otros cursos',
          isWorkshop: false,
          single: !hasChildren && list.length === 1,
          average,
          courses: list.map(({ areaCode: _a, kind: _k, ...c }) => c),
        };
      })
      .filter((x): x is NonNullable<typeof x> => !!x);
    const workshops = courses
      .filter((c) => c.areaCode === 'WORKSHOP')
      .map(({ areaCode: _a, kind: _k, ...c }) => ({ code: `WORKSHOP_${c.id}`, name: c.name, isWorkshop: true, single: true, average: c.average, courses: [c] }));
    const areas = [...grouped, ...workshops];
    const criteriaColumns = [...new Map(courses.flatMap((c) => c.criteria).map((k) => [k.id, k])).values()]
      .sort((x, y) => x.order - y.order || x.name.localeCompare(y.name, 'es'))
      .map((k) => ({ id: k.id, name: k.name, shortName: k.shortName }));

    // Conducta y comentario del tutor o tutora por periodo (libreta interna)
    const periodReports = await prisma.studentPeriodReport.findMany({ where: { enrollmentId: enr.id, periodNumber: { in: visiblePeriods } } });
    const conduct = visiblePeriods.map((p) => {
      const r = periodReports.find((x) => x.periodNumber === p);
      return {
        periodNumber: p,
        score: r?.conductScore ?? null,
        letter: r?.conductLetter ?? (r?.conductScore != null ? scoreToLetter(r.conductScore, thresholds) : null),
        comment: r?.conductComment ?? '',
        tutorComment: r?.tutorComment ?? '',
      };
    });

    const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { name: true, modularCode: true, documentId: true, address: true, logoUrl: true } });
    const tutor = enr.classroom.tutorTeacher;
    return {
      school,
      student: { fullName: fullNameOf(enr.student), studentCode: enr.student.studentCode, documentId: enr.student.documentId },
      classroom: { educationLevel: level, grade: enr.classroom.grade, section: enr.classroom.section, label: `${gradeLabel(level, enr.classroom.grade)} "${enr.classroom.section}"` },
      academicYear: { year: year.year, annualCalculationMode: year.annualCalculationMode },
      tutor: tutor ? `${tutor.firstName} ${tutor.lastNamePaternal} ${tutor.lastNameMaternal ?? ''}`.trim() : null,
      periods: statuses.map((s, i) => ({ periodNumber: i + 1, name: periodName(year, i + 1), status: s })),
      visiblePeriods,
      officialAreas,
      criteriaColumns,
      areas,
      conduct,
      finalSituation: allClosed ? finalStudent?.finalSituation ?? null : null,
      scaleLegend: SCALE_LEGEND,
    };
  }

  /** Libretas de todo un aula (vista de impresión). */
  async getClassroomReportCards(schoolId: string, user: AcademicUser, classroomId: string) {
    const year = await prisma.academicYear.findFirst({ where: { schoolId, isActive: true } });
    if (!year) throw new AppError('No hay un año lectivo activo.', 409);
    const classroom = await prisma.classroom.findFirst({ where: { id: classroomId, schoolId } });
    if (!classroom) throw new AppError('Aula no encontrada.', 404);
    if (user.role === 'TEACHER' && classroom.tutorTeacherId !== user.userId) throw new AppError('Solo el tutor o tutora del aula puede imprimir sus libretas.', 403);
    const enrollments = await prisma.enrollment.findMany({
      where: { schoolId, classroomId, academicYearId: year.id, enrollmentState: 'REGISTERED' },
      include: { student: { select: { lastNamePaternal: true, lastNameMaternal: true, firstNames: true } } },
      orderBy: [{ student: { lastNamePaternal: 'asc' } }, { student: { lastNameMaternal: 'asc' } }, { student: { firstNames: 'asc' } }],
    });
    const cards = [];
    for (const e of enrollments) cards.push(await this.getReportCard(schoolId, user, e.id));
    return cards;
  }
}

