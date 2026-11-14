import { prisma } from '../../config/prisma';
import { AppError } from '../../core/errors/app-error';
import { getSchoolNow } from '../../utils/timezone.util';
import { fromCents, sumPaidCents, toCents } from '../payments/payment.rules';
import type { EnrollmentService } from './enrollment.service';
import { nextGrade, pickTargetClassroom, rolloverFlags, type Level } from './rollover.rules';

type Condition = 'INGRESANTE' | 'CONTINUO' | 'TRASLADO' | 'REENTRANTE';

export interface RolloverItem {
  studentId: string;
  classroomId: string;
  condition: Condition;
  repeatingGrade: boolean;
}

/** Re-matrícula: pasar alumnos de un año al siguiente sin volver a llenar la ficha. */
export class RolloverService {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  private async years(schoolId: string, fromId: string, toId: string) {
    if (fromId === toId) throw new AppError('Elige un año de destino distinto al de origen.', 400);
    const [from, to] = await Promise.all([
      prisma.academicYear.findFirst({ where: { id: fromId, schoolId }, select: { id: true, year: true } }),
      prisma.academicYear.findFirst({ where: { id: toId, schoolId }, select: { id: true, year: true } }),
    ]);
    if (!from || !to) throw new AppError('Año académico no encontrado.', 404);
    return { from, to };
  }

  /**
   * Alumnos matriculados (vigentes) en el año de origen con el grado y aula propuestos para el
   * destino, su ratificación, deuda vencida y si ya tienen matrícula en el año destino.
   */
  async candidates(schoolId: string, input: { fromAcademicYearId: string; toAcademicYearId: string; classroomId?: string }) {
    const { from, to } = await this.years(schoolId, input.fromAcademicYearId, input.toAcademicYearId);
    const enrollments = await prisma.enrollment.findMany({
      where: { schoolId, academicYearId: from.id, enrollmentState: 'REGISTERED', ...(input.classroomId ? { classroomId: input.classroomId } : {}) },
      select: {
        id: true,
        finalSituation: true,
        student: { select: { id: true, firstNames: true, lastNamePaternal: true, lastNameMaternal: true, documentId: true } },
        classroom: { select: { id: true, educationLevel: true, grade: true, section: true, shift: true } },
      },
    });
    const studentIds = enrollments.map((e) => e.student.id);
    const today = getSchoolNow().dateObj;

    const [already, ratifications, overdue, allClassrooms, targetCounts, targetSections] = await Promise.all([
      prisma.enrollment.findMany({
        where: { schoolId, academicYearId: to.id, studentId: { in: studentIds } },
        select: { studentId: true, classroom: { select: { educationLevel: true, grade: true, section: true } } },
      }),
      prisma.enrollmentRatification.findMany({
        where: { schoolId, targetYear: to.year, studentId: { in: studentIds } },
        select: { studentId: true, decision: true },
      }),
      prisma.paymentObligation.findMany({
        where: {
          schoolId,
          status: { in: ['PENDING', 'PARTIAL'] },
          dueDate: { lt: today },
          enrollment: { studentId: { in: studentIds } },
        },
        select: { amountDue: true, enrollment: { select: { studentId: true } }, transactions: { where: { status: 'ACTIVE' }, select: { amountPaid: true } } },
      }),
      prisma.classroom.findMany({
        where: { schoolId },
        select: { id: true, educationLevel: true, grade: true, section: true, shift: true, capacity: true },
        orderBy: [{ educationLevel: 'asc' }, { grade: 'asc' }, { section: 'asc' }],
      }),
      prisma.enrollment.groupBy({
        by: ['classroomId'],
        where: { schoolId, academicYearId: to.id, enrollmentState: 'REGISTERED' },
        _count: { _all: true },
      }),
      prisma.classroomYear.findMany({ where: { schoolId, academicYearId: to.id }, select: { classroomId: true, capacity: true } }),
    ]);
    // Solo las secciones abiertas en el año destino (si ya las definió), con sus vacantes de ese año
    const classrooms =
      targetSections.length === 0
        ? allClassrooms
        : allClassrooms
            .filter((c) => targetSections.some((s) => s.classroomId === c.id))
            .map((c) => ({ ...c, capacity: targetSections.find((s) => s.classroomId === c.id)!.capacity }));

    const alreadyBy = new Map(already.map((a) => [a.studentId, a.classroom]));
    const ratBy = new Map(ratifications.map((r) => [r.studentId, r.decision]));
    const debtCents = new Map<string, number>();
    for (const ob of overdue) {
      const balance = toCents(ob.amountDue) - sumPaidCents(ob.transactions);
      if (balance > 0) debtCents.set(ob.enrollment.studentId, (debtCents.get(ob.enrollment.studentId) ?? 0) + balance);
    }

    const rows = enrollments.map((e) => {
      const step = nextGrade(e.classroom.educationLevel as Level, e.classroom.grade, e.finalSituation);
      const target = step.kind === 'GRADUATE' ? null : pickTargetClassroom(classrooms, { level: step.level, grade: step.grade }, e.classroom);
      const overdueDebt = fromCents(debtCents.get(e.student.id) ?? 0);
      const ratification = ratBy.get(e.student.id) ?? null;
      const marks = rolloverFlags({
        alreadyEnrolled: alreadyBy.has(e.student.id),
        step,
        ratification,
        finalSituation: e.finalSituation,
        overdueDebt,
        hasTargetClassroom: !!target,
      });
      return {
        fromEnrollmentId: e.id,
        student: e.student,
        fromClassroom: e.classroom,
        finalSituation: e.finalSituation,
        step,
        proposedClassroomId: target?.id ?? null,
        repeatingGrade: step.kind === 'REPEAT',
        ratification,
        overdueDebt,
        enrolledInTarget: alreadyBy.get(e.student.id) ?? null,
        ...marks,
      };
    });
    rows.sort(
      (a, b) =>
        a.fromClassroom.educationLevel.localeCompare(b.fromClassroom.educationLevel) ||
        a.fromClassroom.grade - b.fromClassroom.grade ||
        a.fromClassroom.section.localeCompare(b.fromClassroom.section) ||
        a.student.lastNamePaternal.localeCompare(b.student.lastNamePaternal),
    );

    const countBy = new Map(targetCounts.map((c) => [c.classroomId, c._count._all]));
    return {
      fromYear: from,
      toYear: to,
      classrooms: classrooms.map((c) => ({ ...c, enrolledInTarget: countBy.get(c.id) ?? 0 })),
      rows,
    };
  }

  /**
   * Matricula en el año destino a los alumnos elegidos. Cada alumno va en su propia transacción
   * (con su cronograma de cuotas), así un error en uno no detiene a los demás.
   */
  async enroll(schoolId: string, actorUserId: string, input: { toAcademicYearId: string; items: RolloverItem[] }) {
    const year = await prisma.academicYear.findFirst({ where: { id: input.toAcademicYearId, schoolId }, select: { id: true, year: true } });
    if (!year) throw new AppError('Año académico no encontrado.', 404);
    const studentIds = [...new Set(input.items.map((i) => i.studentId))];
    const students = await prisma.student.findMany({
      where: { schoolId, id: { in: studentIds } },
      select: { id: true, firstNames: true, lastNamePaternal: true },
    });
    const nameBy = new Map(students.map((s) => [s.id, `${s.lastNamePaternal}, ${s.firstNames}`]));

    const results: Array<{ studentId: string; name: string; ok: boolean; enrollmentId?: string; cuotas?: number; total?: number; warning?: string | null; error?: string }> = [];
    for (const item of input.items) {
      const name = nameBy.get(item.studentId) ?? 'Estudiante';
      if (!nameBy.has(item.studentId)) {
        results.push({ studentId: item.studentId, name, ok: false, error: 'Estudiante no encontrado.' });
        continue;
      }
      try {
        const enrollment = await this.enrollmentService.createEnrollment(
          schoolId,
          { studentId: item.studentId, academicYearId: year.id, classroomId: item.classroomId, condition: item.condition, repeatingGrade: item.repeatingGrade },
          actorUserId,
        );
        results.push({
          studentId: item.studentId,
          name,
          ok: true,
          enrollmentId: enrollment.id,
          cuotas: enrollment.schedule.created,
          total: enrollment.schedule.total,
          warning: enrollment.schedule.warning,
        });
      } catch (err) {
        results.push({ studentId: item.studentId, name, ok: false, error: err instanceof Error ? err.message : 'No se pudo matricular.' });
      }
    }
    const ok = results.filter((r) => r.ok);
    return {
      year: year.year,
      enrolled: ok.length,
      failed: results.length - ok.length,
      cuotas: ok.reduce((acc, r) => acc + (r.cuotas ?? 0), 0),
      withoutFeeSchedule: ok.filter((r) => r.warning).length,
      results,
    };
  }
}
