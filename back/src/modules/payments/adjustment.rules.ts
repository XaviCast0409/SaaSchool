/**
 * Reglas puras de ajustes a cuotas (descuentos, becas, moras y notas de crédito).
 * Todo en céntimos enteros. amountDue de la cuota = monto original + moras − descuentos/becas/NC.
 */
import { fromCents, toCents } from './payment.rules';

type Money = number | string | { toString(): string };

export const ADJUSTMENT_TYPES = ['DISCOUNT', 'SCHOLARSHIP', 'LATE_FEE', 'CREDIT_NOTE'] as const;
export type AdjustmentTypeCode = (typeof ADJUSTMENT_TYPES)[number];

export const ADJUSTMENT_LABEL: Record<AdjustmentTypeCode, string> = {
  DISCOUNT: 'Descuento',
  SCHOLARSHIP: 'Beca',
  LATE_FEE: 'Mora',
  CREDIT_NOTE: 'Nota de crédito',
};

/** +1 si el ajuste aumenta la deuda (mora), −1 si la reduce. */
export function adjustmentSign(type: AdjustmentTypeCode): 1 | -1 {
  return type === 'LATE_FEE' ? 1 : -1;
}

export function formatAdjustmentNumber(counter: number): string {
  return `AJ-${String(counter).padStart(6, '0')}`;
}

/**
 * Nuevo monto vigente de la cuota al aplicar (direction = 1) o anular (direction = −1) un ajuste.
 * Una rebaja nunca deja la cuota por debajo de lo ya pagado ni por debajo de cero.
 */
export function applyAdjustment(
  currentDue: Money,
  paid: Money,
  type: AdjustmentTypeCode,
  amount: Money,
  direction: 1 | -1 = 1,
): { newDue: number } | { error: string } {
  const a = toCents(amount);
  if (a <= 0) return { error: 'El monto del ajuste debe ser mayor a cero.' };
  const due = toCents(currentDue);
  const paidCents = toCents(paid);
  const next = due + adjustmentSign(type) * direction * a;
  if (next < 0) return { error: 'El ajuste deja la cuota con monto negativo.' };
  if (next < paidCents) {
    return {
      error: `El ajuste deja la cuota (S/ ${fromCents(next).toFixed(2)}) por debajo de lo ya pagado (S/ ${fromCents(paidCents).toFixed(2)}). Anula primero el cobro o registra una devolución.`,
    };
  }
  return { newDue: fromCents(next) };
}

/** Monto de una beca para una cuota: porcentaje del monto original o monto fijo (sin pasarse). */
export function scholarshipAmount(base: Money, kind: 'PERCENT' | 'FIXED', value: Money): number {
  const baseCents = toCents(base);
  if (kind === 'PERCENT') {
    const pct = Number(value.toString());
    if (!(pct > 0) || pct > 100) return 0;
    return fromCents(Math.round((baseCents * pct) / 100));
  }
  return fromCents(Math.min(toCents(value), baseCents));
}

/** ¿La beca cubre una cuota con este concepto y vencimiento? (fechas YYYY-MM-DD) */
export function scholarshipCovers(
  s: { concepts: string[]; validFrom: string; validTo: string | null },
  concept: string,
  dueDate: string,
): boolean {
  if (!s.concepts.includes(concept)) return false;
  if (dueDate < s.validFrom) return false;
  if (s.validTo && dueDate > s.validTo) return false;
  return true;
}

/**
 * Interés moratorio: saldo × tasa anual / 360 × días de atraso (desde el vencimiento), solo si ya
 * pasaron los días de gracia. La ley (Ley 27665) limita la tasa a la interbancaria del BCRP.
 */
export function lateFeeInterest(balance: Money, annualRatePct: Money, daysOverdue: number, graceDays = 0): number {
  const rate = Number(annualRatePct.toString());
  if (!(rate > 0) || daysOverdue <= graceDays) return 0;
  const cents = toCents(balance);
  if (cents <= 0) return 0;
  return fromCents(Math.round((cents * rate * daysOverdue) / (100 * 360)));
}

/** Mora pendiente de cargar: lo que corresponde hoy menos lo ya cargado (nunca negativo). */
export function pendingLateFee(interestDue: Money, alreadyCharged: Money): number {
  return fromCents(Math.max(0, toCents(interestDue) - toCents(alreadyCharged)));
}
