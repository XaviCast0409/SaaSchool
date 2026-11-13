import type { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../core/errors/app-error';
import { formatDateOnly, getSchoolNow, parseSchoolDate } from '../../utils/timezone.util';
import { computeObligationStatus, daysOverdue, fromCents, sumPaidCents, toCents } from './payment.rules';
import {
  ADJUSTMENT_LABEL,
  applyAdjustment,
  formatAdjustmentNumber,
  lateFeeInterest,
  pendingLateFee,
  scholarshipAmount,
  scholarshipCovers,
  type AdjustmentTypeCode,
} from './adjustment.rules';

export interface AdjustmentActor {
  userId: string;
}

/** Fecha YYYY-MM-DD (las fechas de cuotas y becas se guardan a medianoche UTC). */
const isoDate = (d: Date | string) => new Date(d).toISOString().slice(0, 10);

const PERSON = { select: { id: true, firstName: true, lastNamePaternal: true } } as const;
const STUDENT = {
  select: { id: true, firstNames: true, lastNamePaternal: true, lastNameMaternal: true, documentId: true },
} as const;

export const ADJUSTMENT_INCLUDE = {
  createdBy: PERSON,
  voidedBy: PERSON,
  scholarship: { select: { id: true, name: true } },
} as const;

/** Descuentos, becas, moras y notas de crédito con trazabilidad (nada se borra). */
export class AdjustmentService {
  /**
   * Crea un ajuste dentro de una transacción: bloquea la cuota, valida que no quede por debajo
   * de lo pagado, numera el ajuste (AJ-…) y recalcula el monto vigente y el estado de la cuota.
   */
  async createInTx(
    tx: Prisma.TransactionClient,
    schoolId: string,
    actor: AdjustmentActor,
    input: { obligationId: string; type: AdjustmentTypeCode; amount: number; reason: string; scholarshipId?: string | null },
  ) {
    await tx.$queryRaw`SELECT "id" FROM "PaymentObligation" WHERE "id" = ${input.obligationId} AND "schoolId" = ${schoolId} FOR UPDATE`;
    const ob = await tx.paymentObligation.findFirst({
      where: { id: input.obligationId, schoolId },
      include: { transactions: { where: { status: 'ACTIVE' }, select: { amountPaid: true } } },
    });
    if (!ob) throw new AppError('Cuota no encontrada.', 404);
    if (ob.status === 'CANCELLED') throw new AppError('No se puede ajustar una cuota anulada.', 400);

    const paid = fromCents(sumPaidCents(ob.transactions));
    const result = applyAdjustment(ob.amountDue, paid, input.type, input.amount);
    if ('error' in result) throw new AppError(result.error, 400);

    const school = await tx.school.update({
      where: { id: schoolId },
      data: { adjustmentCounter: { increment: 1 } },
      select: { adjustmentCounter: true },
    });
    const adjustment = await tx.obligationAdjustment.create({
      data: {
        schoolId,
        obligationId: ob.id,
        number: formatAdjustmentNumber(school.adjustmentCounter),
        type: input.type,
        amount: input.amount,
        reason: input.reason.trim(),
        scholarshipId: input.scholarshipId ?? null,
        createdById: actor.userId,
      },
      include: ADJUSTMENT_INCLUDE,
    });
    await tx.paymentObligation.update({
      where: { id: ob.id },
      data: {
        amountDue: result.newDue,
        originalAmount: ob.originalAmount ?? ob.amountDue,
        status: computeObligationStatus(result.newDue, ob.transactions),
      },
    });
    return adjustment;
  }

  async create(
    schoolId: string,
    actor: AdjustmentActor,
    input: { obligationId: string; type: AdjustmentTypeCode; amount: number; reason: string },
  ) {
    if (input.type === 'SCHOLARSHIP') {
      throw new AppError('Las becas se registran en "Becas y moras" y se aplican desde allí.', 400);
    }
    return prisma.$transaction((tx) => this.createInTx(tx, schoolId, actor, input));
  }

  /** Anula un ajuste y revierte su efecto en la cuota (con motivo; queda visible). */
  async void(schoolId: string, actor: AdjustmentActor, adjustmentId: string, reason: string) {
    return prisma.$transaction(async (tx) => {
      const adj = await tx.obligationAdjustment.findFirst({ where: { id: adjustmentId, schoolId } });
      if (!adj) throw new AppError('Ajuste no encontrado.', 404);
      if (adj.status === 'VOIDED') throw new AppError('Este ajuste ya fue anulado.', 400);
      await tx.$queryRaw`SELECT "id" FROM "PaymentObligation" WHERE "id" = ${adj.obligationId} FOR UPDATE`;
      const ob = await tx.paymentObligation.findUniqueOrThrow({
        where: { id: adj.obligationId },
        include: { transactions: { where: { status: 'ACTIVE' }, select: { amountPaid: true } } },
      });
      if (ob.status === 'CANCELLED') throw new AppError('La cuota está anulada; su ajuste ya no se puede modificar.', 400);
      const paid = fromCents(sumPaidCents(ob.transactions));
      const result = applyAdjustment(ob.amountDue, paid, adj.type, adj.amount, -1);
      if ('error' in result) throw new AppError(result.error, 400);

      const after = await tx.obligationAdjustment.update({
        where: { id: adj.id },
        data: { status: 'VOIDED', voidedAt: new Date(), voidedById: actor.userId, voidReason: reason.trim() },
        include: ADJUSTMENT_INCLUDE,
      });
      await tx.paymentObligation.update({
        where: { id: ob.id },
        data: { amountDue: result.newDue, status: computeObligationStatus(result.newDue, ob.transactions) },
      });
      return { before: adj, after };
    });
  }

  async listByObligation(schoolId: string, obligationId: string) {
    return prisma.obligationAdjustment.findMany({
      where: { schoolId, obligationId },
      include: ADJUSTMENT_INCLUDE,
      orderBy: { createdAt: 'asc' },
    });
  }

  /** Listado para reportes: ajustes en un rango de fechas (por fecha de registro). */
  async list(schoolId: string, filters: { startDate?: string; endDate?: string; type?: AdjustmentTypeCode }) {
    return prisma.obligationAdjustment.findMany({
      where: {
        schoolId,
        ...(filters.type ? { type: filters.type } : {}),
        ...(filters.startDate || filters.endDate
          ? {
              createdAt: {
                ...(filters.startDate ? { gte: new Date(`${filters.startDate}T00:00:00.000-05:00`) } : {}),
                ...(filters.endDate ? { lte: new Date(`${filters.endDate}T23:59:59.999-05:00`) } : {}),
              },
            }
          : {}),
      },
      include: {
        ...ADJUSTMENT_INCLUDE,
        obligation: {
          select: {
            title: true,
            concept: true,
            enrollment: { select: { student: STUDENT, classroom: { select: { grade: true, section: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });
  }

  // ────────────────────────────────────────────────────────────────
  // Becas
  // ────────────────────────────────────────────────────────────────

  async listScholarships(schoolId: string, filters: { enrollmentId?: string; activeOnly?: boolean }) {
    return prisma.scholarship.findMany({
      where: {
        schoolId,
        ...(filters.enrollmentId ? { enrollmentId: filters.enrollmentId } : {}),
        ...(filters.activeOnly ? { isActive: true } : {}),
      },
      include: {
        createdBy: PERSON,
        deactivatedBy: PERSON,
        enrollment: { select: { id: true, student: STUDENT, classroom: { select: { grade: true, section: true, educationLevel: true } } } },
        _count: { select: { adjustments: { where: { status: 'ACTIVE' } } } },
      },
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async createScholarship(
    schoolId: string,
    actor: AdjustmentActor,
    dto: {
      enrollmentId?: string;
      studentId?: string;
      name: string;
      kind: 'PERCENT' | 'FIXED';
      value: number;
      concepts: string[];
      validFrom: string;
      validTo?: string | null;
      reason: string;
      applyNow?: boolean;
    },
  ) {
    let enrollmentId = dto.enrollmentId;
    if (!enrollmentId && dto.studentId) {
      const enr = await prisma.enrollment.findFirst({
        where: { schoolId, studentId: dto.studentId, isActive: true },
        orderBy: { enrollmentDate: 'desc' },
        select: { id: true },
      });
      enrollmentId = enr?.id;
    }
    if (!enrollmentId) throw new AppError('No se encontró una matrícula activa para el estudiante.', 404);
    const enrollment = await prisma.enrollment.findFirst({ where: { id: enrollmentId, schoolId }, select: { id: true } });
    if (!enrollment) throw new AppError('Matrícula no encontrada.', 404);
    if (dto.kind === 'PERCENT' && (dto.value <= 0 || dto.value > 100)) {
      throw new AppError('El porcentaje de la beca debe estar entre 1 y 100.', 400);
    }
    if (dto.validTo && dto.validTo < dto.validFrom) throw new AppError('La fecha final no puede ser anterior a la inicial.', 400);

    const scholarship = await prisma.scholarship.create({
      data: {
        schoolId,
        enrollmentId,
        name: dto.name.trim(),
        kind: dto.kind,
        value: dto.value,
        concepts: dto.concepts,
        validFrom: parseSchoolDate(dto.validFrom),
        validTo: dto.validTo ? parseSchoolDate(dto.validTo) : null,
        reason: dto.reason.trim(),
        createdById: actor.userId,
      },
    });
    const applied = dto.applyNow ? await this.applyScholarship(schoolId, actor, scholarship.id) : { applied: 0, skipped: 0 };
    return { scholarship, ...applied };
  }

  /**
   * Aplica una beca a las cuotas pendientes que cubre (y que aún no la tienen). Las cuotas ya
   * pagadas no se tocan: para devolver dinero se usa una nota de crédito o se anula el cobro.
   */
  async applyScholarship(schoolId: string, actor: AdjustmentActor, scholarshipId: string, obligationIds?: string[]) {
    const s = await prisma.scholarship.findFirst({ where: { id: scholarshipId, schoolId } });
    if (!s) throw new AppError('Beca no encontrada.', 404);
    if (!s.isActive) throw new AppError('Esta beca está desactivada.', 400);

    const obligations = await prisma.paymentObligation.findMany({
      where: {
        schoolId,
        enrollmentId: s.enrollmentId,
        status: { in: ['PENDING', 'PARTIAL'] },
        concept: { in: s.concepts },
        ...(obligationIds ? { id: { in: obligationIds } } : {}),
        NOT: { adjustments: { some: { scholarshipId: s.id, status: 'ACTIVE' } } },
      },
      select: { id: true, concept: true, dueDate: true, amountDue: true, originalAmount: true },
      orderBy: { dueDate: 'asc' },
    });
    const sRange = { concepts: s.concepts, validFrom: isoDate(s.validFrom), validTo: s.validTo ? isoDate(s.validTo) : null };

    let applied = 0;
    let skipped = 0;
    for (const ob of obligations) {
      if (!scholarshipCovers(sRange, ob.concept, isoDate(ob.dueDate))) continue;
      const amount = scholarshipAmount(ob.originalAmount ?? ob.amountDue, s.kind, s.value);
      if (amount <= 0) continue;
      try {
        await prisma.$transaction((tx) =>
          this.createInTx(tx, schoolId, actor, {
            obligationId: ob.id,
            type: 'SCHOLARSHIP',
            amount,
            reason: `${s.name}: ${s.kind === 'PERCENT' ? `${Number(s.value)} %` : `S/ ${Number(s.value).toFixed(2)}`} — ${s.reason}`,
            scholarshipId: s.id,
          }),
        );
        applied++;
      } catch {
        // Ej.: la cuota ya tiene pagos que no dejan aplicar el monto completo
        skipped++;
      }
    }
    return { applied, skipped };
  }

  /** Aplica las becas vigentes a cuotas recién generadas (cronograma masivo). */
  async applyActiveScholarshipsTo(schoolId: string, actor: AdjustmentActor, obligationIds: string[]) {
    if (obligationIds.length === 0) return 0;
    const enrollmentIds = (
      await prisma.paymentObligation.findMany({ where: { id: { in: obligationIds } }, select: { enrollmentId: true }, distinct: ['enrollmentId'] })
    ).map((o) => o.enrollmentId);
    const scholarships = await prisma.scholarship.findMany({
      where: { schoolId, isActive: true, enrollmentId: { in: enrollmentIds } },
      select: { id: true },
    });
    let total = 0;
    for (const s of scholarships) total += (await this.applyScholarship(schoolId, actor, s.id, obligationIds)).applied;
    return total;
  }

  /** Desactiva una beca. Con `revertPending`, anula su descuento en las cuotas aún no pagadas. */
  async deactivateScholarship(schoolId: string, actor: AdjustmentActor, scholarshipId: string, reason: string, revertPending: boolean) {
    const s = await prisma.scholarship.findFirst({ where: { id: scholarshipId, schoolId } });
    if (!s) throw new AppError('Beca no encontrada.', 404);
    if (!s.isActive) throw new AppError('Esta beca ya está desactivada.', 400);
    await prisma.scholarship.update({
      where: { id: s.id },
      data: { isActive: false, deactivatedAt: new Date(), deactivatedById: actor.userId, deactivationReason: reason.trim() },
    });
    let reverted = 0;
    if (revertPending) {
      const adjustments = await prisma.obligationAdjustment.findMany({
        where: { scholarshipId: s.id, status: 'ACTIVE', obligation: { status: { in: ['PENDING', 'PARTIAL', 'PAID'] }, transactions: { none: { status: 'ACTIVE' } } } },
        select: { id: true },
      });
      for (const a of adjustments) {
        await this.void(schoolId, actor, a.id, `Beca desactivada: ${reason.trim()}`);
        reverted++;
      }
    }
    return { reverted };
  }

  // ────────────────────────────────────────────────────────────────
  // Moras
  // ────────────────────────────────────────────────────────────────

  async getSettings(schoolId: string) {
    const school = await prisma.school.findUniqueOrThrow({
      where: { id: schoolId },
      select: { lateFeeAnnualRate: true, lateFeeGraceDays: true },
    });
    return { lateFeeAnnualRate: school.lateFeeAnnualRate === null ? null : Number(school.lateFeeAnnualRate), lateFeeGraceDays: school.lateFeeGraceDays };
  }

  async updateSettings(schoolId: string, dto: { lateFeeAnnualRate: number | null; lateFeeGraceDays: number }) {
    await prisma.school.update({ where: { id: schoolId }, data: dto });
    return this.getSettings(schoolId);
  }

  /**
   * Calcula la mora que corresponde hoy a cada pensión vencida: interés sobre el saldo (sin
   * contar moras anteriores) por los días de atraso, menos lo ya cargado como mora.
   */
  async previewLateFees(schoolId: string) {
    const settings = await this.getSettings(schoolId);
    if (!settings.lateFeeAnnualRate) {
      return { settings, rows: [], total: 0 };
    }
    const today = getSchoolNow();
    const obligations = await prisma.paymentObligation.findMany({
      where: {
        schoolId,
        concept: 'PENSION',
        status: { in: ['PENDING', 'PARTIAL'] },
        dueDate: { lt: today.dateObj },
        enrollment: { isActive: true },
      },
      select: {
        id: true,
        title: true,
        dueDate: true,
        amountDue: true,
        transactions: { where: { status: 'ACTIVE' }, select: { amountPaid: true } },
        adjustments: { where: { status: 'ACTIVE', type: 'LATE_FEE' }, select: { amount: true } },
        enrollment: { select: { student: STUDENT, classroom: { select: { grade: true, section: true } } } },
      },
      orderBy: { dueDate: 'asc' },
    });

    const rows = [];
    let totalCents = 0;
    for (const ob of obligations) {
      const charged = ob.adjustments.reduce((acc, a) => acc + toCents(a.amount), 0);
      const balanceCents = toCents(ob.amountDue) - sumPaidCents(ob.transactions);
      const principalCents = Math.max(0, balanceCents - charged);
      const days = daysOverdue(ob.dueDate, today.dateObj);
      const interest = lateFeeInterest(fromCents(principalCents), settings.lateFeeAnnualRate, days, settings.lateFeeGraceDays);
      const pending = pendingLateFee(interest, fromCents(charged));
      if (pending <= 0) continue;
      totalCents += toCents(pending);
      rows.push({
        obligationId: ob.id,
        title: ob.title,
        dueDate: ob.dueDate,
        daysOverdue: days,
        balance: fromCents(principalCents),
        alreadyCharged: fromCents(charged),
        interestToDate: interest,
        pending,
        student: ob.enrollment.student,
        classroom: ob.enrollment.classroom,
      });
    }
    return { settings, rows, total: fromCents(totalCents) };
  }

  /** Carga la mora calculada a las cuotas elegidas (se recalcula en el servidor). */
  async applyLateFees(schoolId: string, actor: AdjustmentActor, obligationIds: string[]) {
    const preview = await this.previewLateFees(schoolId);
    if (!preview.settings.lateFeeAnnualRate) throw new AppError('Configura primero la tasa de interés moratorio.', 400);
    const wanted = new Set(obligationIds);
    let applied = 0;
    let totalCents = 0;
    for (const row of preview.rows) {
      if (!wanted.has(row.obligationId)) continue;
      await prisma.$transaction((tx) =>
        this.createInTx(tx, schoolId, actor, {
          obligationId: row.obligationId,
          type: 'LATE_FEE',
          amount: row.pending,
          reason: `Interés moratorio al ${formatDateOnly(getSchoolNow().dateObj)}: ${row.daysOverdue} días de atraso a ${preview.settings.lateFeeAnnualRate} % anual`,
        }),
      );
      applied++;
      totalCents += toCents(row.pending);
    }
    return { applied, total: fromCents(totalCents) };
  }
}

export { ADJUSTMENT_LABEL };
