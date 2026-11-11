import type { EducationLevel } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../core/errors/app-error';
import { getPeriodDateRange } from '../../utils/period-dates.util';
import { gradeLabel } from './cneb.catalog';
import { isResultLetter, type ResultLetter } from './grade-engine';
import { fullNameOf, isAdmin, periodCount, periodName, shortNameOf, sortCompetences, type AcademicUser } from './academic.context';
import { ConsolidationService } from './consolidation.service';
import { PeriodService } from './period.service';

const SCALE_LEGEND = [
  { letter: 'AD', label: 'Logro destacado' },
  { letter: 'A', label: 'Logro esperado' },
  { letter: 'B', label: 'En proceso' },
  { letter: 'C', label: 'En inicio' },
];

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

    // Cursos internos (sub-cursos y talleres)
    const internal = await prisma.courseAssignment.findMany({
      where: { classroomId: enr.classroomId, academicYearId: year.id, deletedAt: null, area: { kind: { in: ['SUBCOURSE', 'WORKSHOP'] } } },
      include: {
        area: { include: { competences: { where: { isActive: true } } } },
        teacher: { select: { firstName: true, lastNamePaternal: true } },
      },
      orderBy: { area: { name: 'asc' } },
    });
    const internalResults = await prisma.competencePeriodResult.findMany({
      where: { enrollmentId: enr.id, courseAssignmentId: { in: internal.map((a) => a.id) }, periodNumber: { in: visiblePeriods } },
    });
    const internalCourses = internal.map((a) => ({
      name: a.area.name,
      kind: a.area.kind,
      teacher: `${a.teacher.firstName} ${a.teacher.lastNamePaternal}`,
      competences: sortCompetences(level, a.area.officialAreaCode, a.area.competences).map((c) => {
        const letters: Record<number, ResultLetter | null> = {};
        visiblePeriods.forEach((p) => {
          const r = internalResults.find((x) => x.courseAssignmentId === a.id && x.competenceId === c.id && x.periodNumber === p);
          letters[p] = isResultLetter(r?.finalLetter) ? (r!.finalLetter as ResultLetter) : null;
        });
        return { name: shortNameOf(c), letters };
      }),
    }));

    // Asistencia por periodo
    const attendance = await Promise.all(
      visiblePeriods.map(async (p) => {
        const range = getPeriodDateRange(year, p);
        const rows = await prisma.attendance.groupBy({
          by: ['status'],
          where: { enrollmentId: enr.id, date: { gte: range.startDate, lte: range.endDate } },
          _count: { _all: true },
        });
        const count = (s: string) => rows.find((r) => r.status === s)?._count._all ?? 0;
        return {
          periodNumber: p,
          absentJustified: count('ABSENT_JUSTIFIED'),
          absentUnjustified: count('ABSENT_UNJUSTIFIED'),
          lateJustified: count('LATE_JUSTIFIED'),
          lateUnjustified: count('LATE_UNJUSTIFIED'),
        };
      }),
    );

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
      internalCourses,
      attendance,
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
