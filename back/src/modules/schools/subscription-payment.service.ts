import type { SubscriptionPayment } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../core/errors/app-error';
import { dateOnlyKey, getSchoolNow, monthRangeUTC, parseSchoolDate } from '../../utils/timezone.util';
import { renewedExpiryKey } from './plan.rules';
import type { CreateSubscriptionPaymentDto } from './subscription-payment.schema';

interface Actor {
  userId: string;
  email?: string | null;
}

export interface SubscriptionPaymentView extends Omit<SubscriptionPayment, 'amount'> {
  amount: number;
}

const toView = (p: SubscriptionPayment): SubscriptionPaymentView => ({ ...p, amount: Number(p.amount) });

const previousMonth = (period: string): string => {
  const [y, m] = period.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 2, 1));
  return d.toISOString().slice(0, 7);
};

/**
 * Pagos de suscripción de los colegios (exclusivo SUPER_ADMIN).
 * Registrar un pago extiende la vigencia del plan; solo el último pago vigente puede anularse,
 * y al anularlo se devuelve la vigencia que tenía antes (si nadie la cambió a mano después).
 */
export class SubscriptionPaymentService {
  async list(schoolId: string): Promise<SubscriptionPaymentView[]> {
    await this.ensureSchool(schoolId);
    const payments = await prisma.subscriptionPayment.findMany({
      where: { schoolId },
      orderBy: [{ paidOn: 'desc' }, { createdAt: 'desc' }],
    });
    return payments.map(toView);
  }

  /** Vista previa: hasta cuándo quedaría vigente el plan si se pagan `months` meses hoy. */
  async preview(schoolId: string, months: number): Promise<{ newExpiresAt: string; currentExpiresAt: string | null }> {
    const school = await this.ensureSchool(schoolId);
    return {
      currentExpiresAt: school.planExpiresAt ? dateOnlyKey(school.planExpiresAt) : null,
      newExpiresAt: renewedExpiryKey(school.planExpiresAt, months),
    };
  }

  async create(schoolId: string, dto: CreateSubscriptionPaymentDto, actor: Actor): Promise<SubscriptionPaymentView> {
    if (dto.paidOn > getSchoolNow().dateStr) {
      throw new AppError('La fecha de pago no puede ser futura.', 422);
    }

    const payment = await prisma.$transaction(async (tx) => {
      const school = await tx.school.findUnique({
        where: { id: schoolId },
        select: { id: true, plan: true, planExpiresAt: true },
      });
      if (!school) throw new AppError('Colegio no encontrado', 404);

      const newExpiresAt = parseSchoolDate(renewedExpiryKey(school.planExpiresAt, dto.monthsCovered));

      const created = await tx.subscriptionPayment.create({
        data: {
          schoolId,
          amount: dto.amount,
          paidOn: parseSchoolDate(dto.paidOn),
          method: dto.method,
          monthsCovered: dto.monthsCovered,
          reference: dto.reference || null,
          notes: dto.notes || null,
          plan: school.plan,
          previousExpiresAt: school.planExpiresAt,
          newExpiresAt,
          createdById: actor.userId,
          createdByEmail: actor.email ?? null,
        },
      });

      await tx.school.update({ where: { id: schoolId }, data: { planExpiresAt: newExpiresAt } });
      return created;
    });

    return toView(payment);
  }

  async void(
    schoolId: string,
    paymentId: string,
    reason: string,
    actor: Actor,
  ): Promise<{ payment: SubscriptionPaymentView; expiryReverted: boolean }> {
    return prisma.$transaction(async (tx) => {
      const payment = await tx.subscriptionPayment.findFirst({ where: { id: paymentId, schoolId } });
      if (!payment) throw new AppError('Pago no encontrado', 404);
      if (payment.voidedAt) throw new AppError('Este pago ya fue anulado.', 409);

      const latest = await tx.subscriptionPayment.findFirst({
        where: { schoolId, voidedAt: null },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      });
      if (latest?.id !== payment.id) {
        throw new AppError('Solo se puede anular el último pago registrado. Anula primero los posteriores.', 409);
      }

      const school = await tx.school.findUniqueOrThrow({ where: { id: schoolId }, select: { planExpiresAt: true } });
      // Solo revertir si la vigencia sigue siendo la que dejó este pago (no se editó a mano después)
      const expiryReverted = school.planExpiresAt?.getTime() === payment.newExpiresAt.getTime();
      if (expiryReverted) {
        await tx.school.update({ where: { id: schoolId }, data: { planExpiresAt: payment.previousExpiresAt } });
      }

      const voided = await tx.subscriptionPayment.update({
        where: { id: paymentId },
        data: { voidedAt: new Date(), voidedByEmail: actor.email ?? null, voidReason: reason },
      });
      return { payment: toView(voided), expiryReverted };
    });
  }

  /** Cobrado (pagos no anulados) este mes y el anterior, por fecha de pago en hora de Lima. */
  async billingSummary(): Promise<{
    period: string;
    collectedThisMonth: number;
    paymentsThisMonth: number;
    collectedLastMonth: number;
  }> {
    const current = monthRangeUTC();
    const last = monthRangeUTC(previousMonth(current.period));

    const [thisMonth, lastMonth] = await Promise.all(
      [current, last].map((range) =>
        prisma.subscriptionPayment.aggregate({
          where: { voidedAt: null, paidOn: { gte: range.startDate, lte: range.endDate } },
          _sum: { amount: true },
          _count: { _all: true },
        }),
      ),
    );

    return {
      period: current.period,
      collectedThisMonth: Number(thisMonth._sum.amount ?? 0),
      paymentsThisMonth: thisMonth._count._all,
      collectedLastMonth: Number(lastMonth._sum.amount ?? 0),
    };
  }

  private async ensureSchool(schoolId: string) {
    const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { id: true, planExpiresAt: true } });
    if (!school) throw new AppError('Colegio no encontrado', 404);
    return school;
  }
}
