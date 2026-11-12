/**
 * Reglas puras de pagos (sin acceso a base de datos) para poder probarlas.
 * Todos los cálculos se hacen en céntimos enteros para evitar errores de
 * redondeo de coma flotante (0.1 + 0.2 ≠ 0.3).
 */

type Money = number | string | { toString(): string };

/** Convierte un monto (number, string o Prisma.Decimal) a céntimos enteros. */
export function toCents(value: Money): number {
  const n = typeof value === 'number' ? value : Number(value.toString());
  if (!Number.isFinite(n)) throw new Error(`Monto inválido: ${String(value)}`);
  return Math.round(n * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

/** Suma de pagos en céntimos. */
export function sumPaidCents(payments: Array<{ amountPaid: Money }>): number {
  return payments.reduce((acc, p) => acc + toCents(p.amountPaid), 0);
}

export type ComputedObligationStatus = 'PENDING' | 'PARTIAL' | 'PAID';

/** Estado de una obligación según lo pagado. */
export function computeObligationStatus(
  amountDue: Money,
  payments: Array<{ amountPaid: Money }>,
): ComputedObligationStatus {
  const due = toCents(amountDue);
  const paid = sumPaidCents(payments);
  if (paid >= due) return 'PAID';
  if (paid > 0) return 'PARTIAL';
  return 'PENDING';
}

/** Saldo pendiente en soles (nunca negativo). */
export function remainingBalance(amountDue: Money, payments: Array<{ amountPaid: Money }>): number {
  return fromCents(Math.max(0, toCents(amountDue) - sumPaidCents(payments)));
}

/**
 * Valida un nuevo pago contra el saldo. Devuelve un mensaje de error o null.
 * No se permite pagar más que el saldo pendiente.
 */
export function validateNewPayment(
  amountDue: Money,
  payments: Array<{ amountPaid: Money }>,
  amount: Money,
): string | null {
  const cents = toCents(amount);
  if (cents <= 0) return 'El monto pagado debe ser mayor a cero.';
  const balance = toCents(amountDue) - sumPaidCents(payments);
  if (cents > balance) {
    return `El monto (S/ ${fromCents(cents).toFixed(2)}) supera el saldo pendiente (S/ ${fromCents(Math.max(0, balance)).toFixed(2)}).`;
  }
  return null;
}

/** Días de atraso respecto a la fecha de vencimiento (0 si aún no vence). */
export function daysOverdue(dueDate: Date, now: Date = new Date()): number {
  const ms = now.getTime() - dueDate.getTime();
  return ms <= 0 ? 0 : Math.floor(ms / 86_400_000);
}
