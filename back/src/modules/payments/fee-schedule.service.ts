import { randomUUID } from 'crypto';
import type { EducationLevel, Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../core/errors/app-error';
import { formatDateOnly, getSchoolNow, getSchoolTimeParts, parseSchoolDate } from '../../utils/timezone.util';
import { AdjustmentService } from './adjustment.service';
import {
  buildEnrollmentSchedule,
  existingPeriodKey,
  pickFeeSchedule,
  repriceObligation,
  scheduleTotal,
  validateFeeTerms,
  type PlannedObligation,
} from './fee-schedule.rules';

type Db = Prisma.TransactionClient | typeof prisma;

export interface FeeScheduleInput {
  academicYearId: string;
  educationLevel: EducationLevel;
  grade?: number | null;
  enrollmentFee: number;
  admissionFee: number;
  monthlyFee: number;
  firstMonth: number;
  lastMonth: number;
  dueDay: number;
}

export interface ScheduleResult {
  /** false si el año/nivel no tiene tarifario: la matrícula se registra igual, sin cuotas. */
  feeScheduleFound: boolean;
  created: number;
  skipped: number;
  total: number;
  obligationIds: string[];
  warning: string | null;
}

const LEVEL_LABEL: Record<string, string> = { INITIAL: 'Inicial', PRIMARY: 'Primaria', SECONDARY: 'Secundaria' };

const toPlain = <T extends { enrollmentFee: unknown; admissionFee: unknown; monthlyFee: unknown }>(s: T) => ({
  ...s,
  enrollmentFee: Number(s.enrollmentFee),
  admissionFee: Number(s.admissionFee),
  monthlyFee: Number(s.monthlyFee),
});

/** Tarifario por año académico y generación del cronograma de cuotas de cada matrícula. */
export class FeeScheduleService {
  async list(schoolId: string, academicYearId?: string) {
    const rows = await prisma.feeSchedule.findMany({
      where: { schoolId, ...(academicYearId ? { academicYearId } : {}) },
      include: { academicYear: { select: { id: true, year: true, name: true } } },
      orderBy: [{ educationLevel: 'asc' }, { grade: 'asc' }],
    });
    return rows.map(toPlain);
  }

  private async validate(schoolId: string, dto: FeeScheduleInput, excludeId?: string) {
    const error = validateFeeTerms(dto);
    if (error) throw new AppError(error, 400);
    const year = await prisma.academicYear.findFirst({ where: { id: dto.academicYearId, schoolId }, select: { id: true } });
    if (!year) throw new AppError('Año académico no encontrado.', 404);
    const grade = dto.grade ?? null;
    const duplicate = await prisma.feeSchedule.findFirst({
      where: { schoolId, academicYearId: dto.academicYearId, educationLevel: dto.educationLevel, grade, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
      select: { id: true },
    });
    if (duplicate) {
      throw new AppError(
        `Ya existe un tarifario para ${LEVEL_LABEL[dto.educationLevel]}${grade ? ` ${grade}°` : ' (todo el nivel)'} en este año.`,
        409,
      );
    }
  }

  async create(schoolId: string, dto: FeeScheduleInput) {
    await this.validate(schoolId, dto);
    const row = await prisma.feeSchedule.create({ data: { ...dto, grade: dto.grade ?? null, schoolId } });
    return toPlain(row);
  }

  async update(schoolId: string, id: string, dto: FeeScheduleInput, applyToPending = false) {
    const before = await prisma.feeSchedule.findFirst({ where: { id, schoolId } });
    if (!before) throw new AppError('Tarifario no encontrado.', 404);
    await this.validate(schoolId, dto, id);
    const after = await prisma.feeSchedule.update({ where: { id }, data: { ...dto, grade: dto.grade ?? null } });
    const repriced = applyToPending ? await this.repricePending(schoolId, after) : 0;
    return { before: toPlain(before), after: toPlain(after), repriced };
  }

  /**
   * Lleva el tarifario editado a las cuotas pendientes que generó: solo las que no tienen cobros
   * ni ajustes (descuentos, becas, moras), de matrículas vigentes de ese año y nivel (y grado).
   * Si el tarifario es de todo el nivel, no toca los grados que tienen su propio tarifario. Las
   * pensiones personalizadas (customPensionAmount) se respetan. No agrega ni quita meses.
   */
  private async repricePending(schoolId: string, fee: Awaited<ReturnType<typeof prisma.feeSchedule.update>>): Promise<number> {
    const ownGrades =
      fee.grade === null
        ? (
            await prisma.feeSchedule.findMany({
              where: { schoolId, academicYearId: fee.academicYearId, educationLevel: fee.educationLevel, grade: { not: null } },
              select: { grade: true },
            })
          ).map((g) => g.grade as number)
        : [];
    const obligations = await prisma.paymentObligation.findMany({
      where: {
        schoolId,
        status: 'PENDING',
        period: { not: null },
        concept: { in: ['PENSION', 'MATRICULA', 'CUOTA_INGRESO'] },
        transactions: { none: { status: 'ACTIVE' } },
        adjustments: { none: { status: 'ACTIVE' } },
        enrollment: {
          academicYearId: fee.academicYearId,
          enrollmentState: 'REGISTERED',
          classroom: {
            educationLevel: fee.educationLevel,
            ...(fee.grade !== null ? { grade: fee.grade } : ownGrades.length ? { grade: { notIn: ownGrades } } : {}),
          },
        },
      },
      select: {
        id: true,
        concept: true,
        period: true,
        amountDue: true,
        dueDate: true,
        enrollment: { select: { enrollmentDate: true, customPensionAmount: true } },
      },
    });
    let count = 0;
    for (const ob of obligations) {
      if (ob.concept === 'PENSION' && ob.enrollment.customPensionAmount !== null) continue;
      const next = repriceObligation(
        { concept: ob.concept, period: ob.period, amountDue: ob.amountDue, dueDate: ob.dueDate.toISOString().slice(0, 10) },
        fee,
        getSchoolTimeParts(ob.enrollment.enrollmentDate).dateStr,
      );
      if (!next) continue;
      await prisma.paymentObligation.update({
        where: { id: ob.id },
        data: { amountDue: next.amountDue, originalAmount: next.amountDue, dueDate: parseSchoolDate(next.dueDate) },
      });
      count++;
    }
    return count;
  }

  /** Borrar el tarifario no toca las cuotas ya generadas. */
  async remove(schoolId: string, id: string) {
    const row = await prisma.feeSchedule.findFirst({ where: { id, schoolId } });
    if (!row) throw new AppError('Tarifario no encontrado.', 404);
    await prisma.feeSchedule.delete({ where: { id } });
    return toPlain(row);
  }

  /** Copia los tarifarios de un año a otro (solo los que aún no existen en el destino). */
  async copyYear(schoolId: string, fromYearId: string, toYearId: string) {
    const [source, target] = await Promise.all([
      prisma.feeSchedule.findMany({ where: { schoolId, academicYearId: fromYearId } }),
      prisma.feeSchedule.findMany({ where: { schoolId, academicYearId: toYearId }, select: { educationLevel: true, grade: true } }),
    ]);
    const year = await prisma.academicYear.findFirst({ where: { id: toYearId, schoolId }, select: { id: true } });
    if (!year) throw new AppError('Año académico de destino no encontrado.', 404);
    const exists = new Set(target.map((t) => `${t.educationLevel}:${t.grade ?? ''}`));
    const toCreate = source.filter((s) => !exists.has(`${s.educationLevel}:${s.grade ?? ''}`));
    if (toCreate.length > 0) {
      await prisma.feeSchedule.createMany({
        data: toCreate.map(({ id: _id, createdAt: _c, updatedAt: _u, ...s }) => ({ ...s, academicYearId: toYearId })),
      });
    }
    return { copied: toCreate.length, skipped: source.length - toCreate.length };
  }

  /** Cronograma que se generaría para una matrícula (vista previa o generación real). */
  async plan(
    db: Db,
    schoolId: string,
    input: { academicYearId: string; classroomId: string; condition: string; enrollmentDate?: string; customPensionAmount?: unknown },
  ): Promise<{ feeScheduleFound: boolean; year: number; items: PlannedObligation[]; total: number; warning: string | null; feeSchedule: ReturnType<typeof toPlain> | null }> {
    const [year, classroom] = await Promise.all([
      db.academicYear.findFirst({ where: { id: input.academicYearId, schoolId }, select: { year: true } }),
      db.classroom.findFirst({ where: { id: input.classroomId, schoolId }, select: { educationLevel: true, grade: true } }),
    ]);
    if (!year) throw new AppError('Año académico no encontrado.', 404);
    if (!classroom) throw new AppError('Aula no encontrada.', 404);

    const schedules = await db.feeSchedule.findMany({
      where: { schoolId, academicYearId: input.academicYearId, educationLevel: classroom.educationLevel },
    });
    const fee = pickFeeSchedule(schedules, classroom);
    if (!fee) {
      return {
        feeScheduleFound: false,
        year: year.year,
        items: [],
        total: 0,
        feeSchedule: null,
        warning: `No hay tarifario de ${LEVEL_LABEL[classroom.educationLevel]} para el año ${year.year}: la matrícula se registra sin cuotas. Configúralo en Tesorería → Tarifario y luego usa "Generar cuotas faltantes".`,
      };
    }
    const custom = input.customPensionAmount;
    const items = buildEnrollmentSchedule({
      year: year.year,
      terms: fee,
      condition: input.condition,
      enrollmentDate: input.enrollmentDate ?? getSchoolNow().dateStr,
      customPensionAmount: custom === null || custom === undefined ? null : String(custom),
    });
    return { feeScheduleFound: true, year: year.year, items, total: scheduleTotal(items), warning: null, feeSchedule: toPlain(fee) };
  }

  /**
   * Cuotas del cronograma que le faltan a una matrícula. Un periodo cuenta como ocupado si ya tiene
   * una cuota (aunque esté anulada: si tesorería la anuló a propósito no se vuelve a crear). Las
   * cuotas antiguas sin periodo se reconocen por su concepto y vencimiento.
   */
  private async missingInTx(db: Db, schoolId: string, enrollmentId: string) {
    const enrollment = await db.enrollment.findFirst({
      where: { id: enrollmentId, schoolId },
      select: { id: true, academicYearId: true, classroomId: true, condition: true, enrollmentDate: true, customPensionAmount: true },
    });
    if (!enrollment) throw new AppError('Matrícula no encontrada.', 404);
    const plan = await this.plan(db, schoolId, {
      academicYearId: enrollment.academicYearId,
      classroomId: enrollment.classroomId,
      condition: enrollment.condition,
      enrollmentDate: getSchoolTimeParts(enrollment.enrollmentDate).dateStr,
      customPensionAmount: enrollment.customPensionAmount,
    });
    if (!plan.feeScheduleFound || plan.items.length === 0) return { plan, missing: [] as PlannedObligation[] };

    // Los periodos no se repiten entre conceptos ('2026-03', 'MATRICULA-2026', 'INGRESO-2026'): una
    // cuota reclasificada a otro concepto sigue ocupando su lugar del cronograma.
    const existing = await db.paymentObligation.findMany({
      where: { enrollmentId, OR: [{ period: { not: null } }, { concept: { in: [...new Set(plan.items.map((i) => i.concept))] } }] },
      select: { concept: true, period: true, dueDate: true },
    });
    const taken = new Set(
      existing.map((e) => existingPeriodKey({ concept: e.concept, period: e.period, dueDate: e.dueDate.toISOString().slice(0, 10) }, plan.year)),
    );
    return { plan, missing: plan.items.filter((i) => !taken.has(i.period)) };
  }

  /**
   * Genera el cronograma de una matrícula dentro de su transacción (al matricular o al completar
   * cuotas faltantes). Nunca duplica un periodo.
   */
  async generateForEnrollmentInTx(tx: Prisma.TransactionClient, schoolId: string, enrollmentId: string): Promise<ScheduleResult> {
    const { plan, missing } = await this.missingInTx(tx, schoolId, enrollmentId);
    if (!plan.feeScheduleFound || plan.items.length === 0) {
      return { feeScheduleFound: plan.feeScheduleFound, created: 0, skipped: 0, total: 0, obligationIds: [], warning: plan.warning };
    }
    const rows = missing.map((i) => ({
      id: randomUUID(),
      schoolId,
      enrollmentId,
      title: i.title,
      concept: i.concept,
      period: i.period,
      amountDue: i.amountDue,
      originalAmount: i.amountDue,
      dueDate: parseSchoolDate(i.dueDate),
    }));
    if (rows.length > 0) await tx.paymentObligation.createMany({ data: rows, skipDuplicates: true });
    const created = rows.length > 0 ? await tx.paymentObligation.findMany({ where: { id: { in: rows.map((r) => r.id) } }, select: { id: true } }) : [];
    const createdIds = new Set(created.map((c) => c.id));
    const createdRows = rows.filter((r) => createdIds.has(r.id));
    return {
      feeScheduleFound: true,
      created: createdRows.length,
      skipped: plan.items.length - createdRows.length,
      total: scheduleTotal(createdRows),
      obligationIds: createdRows.map((r) => r.id),
      warning: null,
    };
  }

  /**
   * Completa las cuotas que les faltan a las matrículas vigentes (REGISTERED) de un año: p. ej. las
   * registradas antes de configurar el tarifario. Con `dryRun` solo cuenta lo que se crearía.
   */
  async generateMissing(schoolId: string, actorUserId: string, input: { academicYearId: string; classroomId?: string; dryRun: boolean }) {
    const year = await prisma.academicYear.findFirst({ where: { id: input.academicYearId, schoolId }, select: { year: true } });
    if (!year) throw new AppError('Año académico no encontrado.', 404);
    const enrollments = await prisma.enrollment.findMany({
      where: {
        schoolId,
        academicYearId: input.academicYearId,
        enrollmentState: 'REGISTERED',
        ...(input.classroomId ? { classroomId: input.classroomId } : {}),
      },
      select: { id: true },
    });
    let withMissing = 0;
    let withoutFeeSchedule = 0;
    let cuotas = 0;
    let totalCents = 0;
    let scholarshipsApplied = 0;
    for (const e of enrollments) {
      if (input.dryRun) {
        const { plan, missing } = await this.missingInTx(prisma, schoolId, e.id);
        if (!plan.feeScheduleFound) withoutFeeSchedule++;
        if (missing.length > 0) {
          withMissing++;
          cuotas += missing.length;
          totalCents += Math.round(scheduleTotal(missing) * 100);
        }
        continue;
      }
      const result = await prisma.$transaction((tx) => this.generateForEnrollmentInTx(tx, schoolId, e.id));
      if (!result.feeScheduleFound) withoutFeeSchedule++;
      if (result.created > 0) {
        withMissing++;
        cuotas += result.created;
        totalCents += Math.round(result.total * 100);
        scholarshipsApplied += await this.applyScholarships(schoolId, actorUserId, result);
      }
    }
    return {
      year: year.year,
      dryRun: input.dryRun,
      enrollments: enrollments.length,
      withMissing,
      withoutFeeSchedule,
      cuotas,
      total: totalCents / 100,
      scholarshipsApplied,
    };
  }

  /** Aplica las becas vigentes de la matrícula a las cuotas recién generadas (lógica existente). */
  async applyScholarships(schoolId: string, actorUserId: string | undefined, result: ScheduleResult): Promise<number> {
    if (!actorUserId || result.obligationIds.length === 0) return 0;
    return new AdjustmentService().applyActiveScholarshipsTo(schoolId, { userId: actorUserId }, result.obligationIds);
  }

  /**
   * Al retirar o trasladar: anula con motivo automático las cuotas que vencen después de la fecha
   * de retiro, siguen vigentes y no tienen cobros ni vouchers por revisar. La deuda anterior queda.
   */
  async cancelFutureInTx(
    tx: Prisma.TransactionClient,
    schoolId: string,
    enrollmentId: string,
    state: 'WITHDRAWN' | 'TRANSFERRED',
    withdrawalDate: string,
    actorUserId: string | null,
  ): Promise<number> {
    const label = state === 'WITHDRAWN' ? 'retiro' : 'traslado';
    const result = await tx.paymentObligation.updateMany({
      where: {
        schoolId,
        enrollmentId,
        status: { not: 'CANCELLED' },
        dueDate: { gt: parseSchoolDate(withdrawalDate) },
        transactions: { none: { status: 'ACTIVE' } },
        paymentReports: { none: { status: 'PENDING' } },
      },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelledById: actorUserId,
        cancelReason: `Anulada automáticamente por ${label} del estudiante el ${formatDateOnly(parseSchoolDate(withdrawalDate))}.`,
      },
    });
    return result.count;
  }
}

export const feeScheduleService = new FeeScheduleService();
