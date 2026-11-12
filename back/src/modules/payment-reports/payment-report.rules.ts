/**
 * Reglas puras de los pagos reportados por las familias (sin base de datos).
 */
import { toCents } from '../payments/payment.rules';

export const REPORT_METHODS = ['YAPE', 'PLIN', 'BANK_TRANSFER', 'DEPOSIT'] as const;
export type ReportMethod = (typeof REPORT_METHODS)[number];

export const METHOD_LABEL: Record<ReportMethod, string> = {
  YAPE: 'Yape',
  PLIN: 'Plin',
  BANK_TRANSFER: 'Transferencia',
  DEPOSIT: 'Depósito',
};

/** Número de operación comparable: sin espacios, guiones ni ceros a la izquierda, en mayúsculas. */
export function normalizeOperationNumber(raw: string): string {
  return raw.replace(/[\s-]/g, '').toUpperCase().replace(/^0+(?=.)/, '');
}

export function isValidOperationNumber(raw: string): boolean {
  const n = normalizeOperationNumber(raw);
  return /^[A-Z0-9]{4,30}$/.test(n);
}

/**
 * ¿El monto reportado cabe en el saldo? Se descuentan también otros reportes aún pendientes
 * de la misma cuota, para que no se reporte dos veces lo mismo mientras tesorería revisa.
 */
export function validateReportedAmount(balance: number, pendingReported: number, amount: number): string | null {
  const a = toCents(amount);
  if (a <= 0) return 'El monto debe ser mayor a cero.';
  const free = toCents(balance) - toCents(pendingReported);
  if (free <= 0) return 'Ya hay un pago reportado por el saldo de esta cuota; espera la validación de tesorería.';
  if (a > free) return `El monto supera el saldo disponible por reportar (S/ ${(free / 100).toFixed(2)}).`;
  return null;
}

/** La fecha de pago no puede ser futura ni de hace más de `maxDays` días. */
export function validatePaidOn(paidOn: string, today: string, maxDays = 90): string | null {
  if (paidOn > today) return 'La fecha de pago no puede ser futura.';
  const diff = (new Date(`${today}T00:00:00Z`).getTime() - new Date(`${paidOn}T00:00:00Z`).getTime()) / 86_400_000;
  if (diff > maxDays) return `La fecha de pago no puede ser de hace más de ${maxDays} días.`;
  return null;
}
