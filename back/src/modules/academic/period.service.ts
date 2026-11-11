import type { PeriodState } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../core/errors/app-error';
import { getPeriodDateRange } from '../../utils/period-dates.util';
import { assertPeriod, periodCount, periodName, resolveYear } from './academic.context';

export interface SetPeriodStatusInput {
  academicYearId?: string;
  periodNumber: number;
  classroomId?: string | null;
  status: PeriodState;
  reason?: string | null;
  gradingDeadline?: string | null;
  force?: boolean;
}

export class PeriodService {
  async list(schoolId: string, academicYearId?: string) {
    const year = await resolveYear(schoolId, academicYearId);
    const statuses = await prisma.academicPeriodStatus.findMany({
      where: { academicYearId: year.id },
      include: { classroom: { select: { grade: true, section: true, educationLevel: true } } },
    });
    return {
      academicYearId: year.id,
      year: year.year,
      annualCalculationMode: year.annualCalculationMode,
      periods: Array.from({ length: periodCount(year) }, (_, i) => {
        const n = i + 1;
        const school = statuses.find((s) => s.classroomId === null && s.periodNumber === n);
        const range = getPeriodDateRange(year, n);
        return {
          periodNumber: n,
          name: periodName(year, n),
          startDate: range.startDate,
          endDate: range.endDate,
          status: (school?.status ?? 'OPEN') as PeriodState,
          gradingDeadline: school?.gradingDeadline ?? null,
          reason: school?.reason ?? null,
          changedAt: school?.changedAt ?? null,
          overrides: statuses
            .filter((s) => s.classroomId !== null && s.periodNumber === n)
            .map((s) => ({ classroomId: s.classroomId!, classroom: s.classroom, status: s.status, reason: s.reason })),
        };
      }),
    };
  }

  async getEffectiveStatus(academicYearId: string, periodNumber: number, classroomId: string): Promise<PeriodState> {
    const rows = await prisma.academicPeriodStatus.findMany({
      where: { academicYearId, periodNumber, OR: [{ classroomId }, { classroomId: null }] },
    });
    return rows.find((r) => r.classroomId === classroomId)?.status ?? rows.find((r) => r.classroomId === null)?.status ?? 'OPEN';
  }

  async setStatus(
    schoolId: string,
    userId: string,
    input: SetPeriodStatusInput,
    pending?: { missingGrades: number; missingConclusions: number },
  ) {
    const year = await resolveYear(schoolId, input.academicYearId);
    assertPeriod(year, input.periodNumber);
    if (input.classroomId) {
      const classroom = await prisma.classroom.findFirst({ where: { id: input.classroomId, schoolId } });
      if (!classroom) throw new AppError('Aula no encontrada.', 404);
    }
    if (input.force && !input.reason?.trim()) throw new AppError('Indica el motivo para cerrar con pendientes.', 400);
    if (input.status === 'CLOSED' && pending && (pending.missingGrades > 0 || pending.missingConclusions > 0) && !input.force) {
      throw new AppError(
        `No se puede cerrar: faltan ${pending.missingGrades} calificativos y ${pending.missingConclusions} conclusiones. Revisa el avance o cierra indicando el motivo.`,
        409,
      );
    }
    const data = {
      status: input.status,
      reason: input.reason?.trim() || null,
      changedById: userId,
      changedAt: new Date(),
      ...(input.gradingDeadline !== undefined ? { gradingDeadline: input.gradingDeadline ? new Date(input.gradingDeadline) : null } : {}),
    };
    const existing = await prisma.academicPeriodStatus.findFirst({
      where: { academicYearId: year.id, periodNumber: input.periodNumber, classroomId: input.classroomId ?? null },
    });
    return existing
      ? prisma.academicPeriodStatus.update({ where: { id: existing.id }, data })
      : prisma.academicPeriodStatus.create({
          data: { schoolId, academicYearId: year.id, periodNumber: input.periodNumber, classroomId: input.classroomId ?? null, ...data },
        });
  }
}

