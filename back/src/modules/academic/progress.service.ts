import type { EducationLevel } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { NotificationService } from '../notifications/notification.service';
import { NotificationRepository } from '../notifications/notification.repository';
import { isResultLetter, needsConclusion } from './grade-engine';
import { assertPeriod, resolveYear } from './academic.context';

const notificationService = new NotificationService(new NotificationRepository());

export class ProgressService {
  async getProgress(schoolId: string, academicYearId: string | undefined, periodNumber: number, filters: { level?: EducationLevel; classroomId?: string | null; teacherId?: string } = {}) {
    const year = await resolveYear(schoolId, academicYearId);
    assertPeriod(year, periodNumber);
    const assignments = await prisma.courseAssignment.findMany({
      where: {
        schoolId, academicYearId: year.id, deletedAt: null,
        ...(filters.teacherId ? { teacherId: filters.teacherId } : {}),
        ...(filters.classroomId ? { classroomId: filters.classroomId } : {}),
        ...(filters.level ? { classroom: { educationLevel: filters.level } } : {}),
      },
      include: {
        classroom: { select: { id: true, educationLevel: true, grade: true, section: true } },
        area: { select: { name: true, kind: true, competences: { where: { isActive: true }, select: { id: true } } } },
        teacher: { select: { id: true, firstName: true, lastNamePaternal: true } },
      },
      orderBy: [{ classroom: { educationLevel: 'asc' } }, { classroom: { grade: 'asc' } }, { classroom: { section: 'asc' } }],
    });
    const classroomIds = [...new Set(assignments.map((a) => a.classroomId))];
    const enrollments = await prisma.enrollment.findMany({
      where: { schoolId, academicYearId: year.id, classroomId: { in: classroomIds }, isActive: true, enrollmentState: 'REGISTERED' },
      select: { id: true, classroomId: true },
    });
    const activeIds = new Set(enrollments.map((e) => e.id));
    const [results, conclusions] = await Promise.all([
      prisma.competencePeriodResult.findMany({
        where: { courseAssignmentId: { in: assignments.map((a) => a.id) }, periodNumber, finalLetter: { not: null } },
        select: { courseAssignmentId: true, enrollmentId: true, competenceId: true, finalLetter: true },
      }),
      prisma.competenceConclusion.findMany({
        where: { courseAssignmentId: { in: assignments.map((a) => a.id) }, periodNumber },
        select: { courseAssignmentId: true, enrollmentId: true, competenceId: true, conclusion: true },
      }),
    ]);
    const rows = assignments.map((a) => {
      const students = enrollments.filter((e) => e.classroomId === a.classroomId).length;
      const compIds = new Set(a.area.competences.map((c) => c.id));
      const expected = students * compIds.size;
      const mine = results.filter((r) => r.courseAssignmentId === a.id && activeIds.has(r.enrollmentId) && compIds.has(r.competenceId));
      const needConc = mine.filter((r) => isResultLetter(r.finalLetter) && needsConclusion(r.finalLetter));
      const missingConclusions = needConc.filter(
        (r) => !conclusions.some((c) => c.courseAssignmentId === a.id && c.enrollmentId === r.enrollmentId && c.competenceId === r.competenceId && c.conclusion.trim()),
      ).length;
      return {
        assignmentId: a.id,
        classroom: a.classroom,
        course: a.area.name,
        kind: a.area.kind,
        teacher: { id: a.teacher.id, name: `${a.teacher.firstName} ${a.teacher.lastNamePaternal}` },
        students,
        expected,
        filled: mine.length,
        percent: expected > 0 ? Math.round((mine.length * 100) / expected) : 100,
        missingGrades: Math.max(expected - mine.length, 0),
        missingConclusions,
      };
    });
    const totals = rows.reduce(
      (acc, r) => ({ expected: acc.expected + r.expected, filled: acc.filled + r.filled, missingGrades: acc.missingGrades + r.missingGrades, missingConclusions: acc.missingConclusions + r.missingConclusions }),
      { expected: 0, filled: 0, missingGrades: 0, missingConclusions: 0 },
    );
    return { academicYearId: year.id, periodNumber, rows, totals: { ...totals, percent: totals.expected ? Math.round((totals.filled * 100) / totals.expected) : 100 } };
  }

  async remindPending(schoolId: string, academicYearId: string | undefined, periodNumber: number) {
    const { rows } = await this.getProgress(schoolId, academicYearId, periodNumber);
    const byTeacher = new Map<string, { grades: number; conclusions: number }>();
    rows.forEach((r) => {
      if (r.missingGrades === 0 && r.missingConclusions === 0) return;
      const acc = byTeacher.get(r.teacher.id) ?? { grades: 0, conclusions: 0 };
      acc.grades += r.missingGrades;
      acc.conclusions += r.missingConclusions;
      byTeacher.set(r.teacher.id, acc);
    });
    for (const [teacherId, p] of byTeacher) {
      await notificationService.createNotification(schoolId, {
        userId: teacherId,
        title: 'Notas pendientes',
        message: `Tienes ${p.grades} calificativos y ${p.conclusions} conclusiones pendientes del ${periodNumber}.° periodo.`,
        type: 'ACADEMIC',
        link: '/my-courses',
      });
    }
    return { notified: byTeacher.size };
  }
}
