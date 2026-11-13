/**
 * Reglas puras de caja y tesorería (sin base de datos) para poder probarlas.
 * Montos siempre en céntimos enteros (ver payment.rules.ts).
 */
import { fromCents, toCents } from './payment.rules';

type Money = number | string | { toString(): string };

// ──────────────────────────────────────────────────────────────────
// Permisos de finanzas
// ──────────────────────────────────────────────────────────────────

/** Nivel efectivo en finanzas. ADMIN = Dirección (acceso total). */
export type FinanceLevel = 'ADMIN' | 'TREASURER' | 'CASHIER' | 'ACCOUNTANT' | 'NONE';

/**
 * - collect: cobrar, crear cuotas sueltas, abrir/cerrar su propia caja y registrar egresos en ella.
 * - manage: generar cuotas masivas, editar o anular cuotas, anular cobros y egresos, validar
 *   vouchers, revisar o reabrir cierres de otros cajeros.
 * - view: ver todo (cajas de todos, resumen financiero), sin modificar nada.
 */
export type FinanceCapability = 'collect' | 'manage' | 'view';

const MATRIX: Record<FinanceLevel, FinanceCapability[]> = {
  ADMIN: ['collect', 'manage', 'view'],
  TREASURER: ['collect', 'manage', 'view'],
  CASHIER: ['collect'],
  ACCOUNTANT: ['view'],
  NONE: [],
};

/**
 * Nivel de una persona según su rol y su rol en finanzas. El personal administrativo sin
 * rol en finanzas asignado se trata como cajero (puede cobrar, pero no anular ni editar).
 */
export function financeLevel(role: string, financeRole: string | null | undefined): FinanceLevel {
  if (role === 'SUPER_ADMIN' || role === 'SCHOOL_ADMIN') return 'ADMIN';
  if (role !== 'ADMINISTRATIVE') return 'NONE';
  if (financeRole === 'TREASURER') return 'TREASURER';
  if (financeRole === 'ACCOUNTANT') return 'ACCOUNTANT';
  return 'CASHIER';
}

export function can(level: FinanceLevel, capability: FinanceCapability): boolean {
  return MATRIX[level].includes(capability);
}

export function capabilities(level: FinanceLevel): Record<FinanceCapability, boolean> {
  return { collect: can(level, 'collect'), manage: can(level, 'manage'), view: can(level, 'view') };
}

export const FINANCE_LEVEL_LABEL: Record<FinanceLevel, string> = {
  ADMIN: 'Dirección',
  TREASURER: 'Tesorero',
  CASHIER: 'Cajero',
  ACCOUNTANT: 'Contador (solo lectura)',
  NONE: 'Sin acceso',
};

// ──────────────────────────────────────────────────────────────────
// Medios de pago
// ──────────────────────────────────────────────────────────────────

export const PAYMENT_METHODS = ['CASH', 'YAPE', 'PLIN', 'BANK_TRANSFER', 'DEPOSIT', 'CREDIT_CARD'] as const;
export type PaymentMethodCode = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABEL: Record<PaymentMethodCode, string> = {
  CASH: 'Efectivo',
  YAPE: 'Yape',
  PLIN: 'Plin',
  BANK_TRANSFER: 'Transferencia',
  DEPOSIT: 'Depósito',
  CREDIT_CARD: 'Tarjeta',
};

/** Todo medio distinto de efectivo necesita número de operación para poder conciliarlo. */
export function requiresOperationNumber(method: PaymentMethodCode): boolean {
  return method !== 'CASH';
}

// ──────────────────────────────────────────────────────────────────
// Correlativos
// ──────────────────────────────────────────────────────────────────

export function formatReceiptNumber(counter: number): string {
  return `REC-${String(counter).padStart(6, '0')}`;
}

export function formatExpenseNumber(counter: number): string {
  return `EGR-${String(counter).padStart(6, '0')}`;
}

// ──────────────────────────────────────────────────────────────────
// Anulaciones
// ──────────────────────────────────────────────────────────────────

export const MIN_REASON_LENGTH = 5;

export function validateReason(reason: string | null | undefined): string | null {
  if (!reason || reason.trim().length < MIN_REASON_LENGTH) {
    return `Escribe el motivo (mínimo ${MIN_REASON_LENGTH} caracteres).`;
  }
  return null;
}

/**
 * ¿Se puede anular un cobro o egreso? Solo si está activo y su caja (si tiene) sigue abierta:
 * un día cerrado no se modifica; el tesorero debe reabrir la caja primero.
 */
export function voidBlockReason(record: {
  status: string;
  cashSessionStatus?: string | null;
}): string | null {
  if (record.status === 'VOIDED') return 'Este registro ya fue anulado.';
  if (record.cashSessionStatus === 'REVIEWED') {
    return 'La caja de este registro ya fue revisada y cerrada definitivamente; no se puede anular.';
  }
  if (record.cashSessionStatus === 'CLOSED') {
    return 'La caja de este registro ya está cerrada. Pide al tesorero que la reabra para poder anularlo.';
  }
  return null;
}

// ──────────────────────────────────────────────────────────────────
// Arqueo y cierre de caja
// ──────────────────────────────────────────────────────────────────

export interface SessionMovements {
  openingAmount: Money;
  payments: Array<{ amountPaid: Money; paymentMethod: string; status: string }>;
  expenses: Array<{ amount: Money; status: string }>;
}

export interface SessionTotals {
  /** Cobros activos por medio de pago, en soles. */
  byMethod: Record<PaymentMethodCode, number>;
  /** Cantidad de cobros activos por medio de pago. */
  countByMethod: Record<PaymentMethodCode, number>;
  totalCollected: number;
  paymentsCount: number;
  voidedCount: number;
  expensesTotal: number;
  expensesCount: number;
  openingAmount: number;
  /** Efectivo que debería haber en caja: fondo + cobros en efectivo − egresos. */
  expectedCash: number;
}

function emptyByMethod(): Record<PaymentMethodCode, number> {
  return { CASH: 0, YAPE: 0, PLIN: 0, BANK_TRANSFER: 0, DEPOSIT: 0, CREDIT_CARD: 0 };
}

export function computeSessionTotals(movements: SessionMovements): SessionTotals {
  const byMethodCents = emptyByMethod();
  const countByMethod = emptyByMethod();
  let collected = 0;
  let paymentsCount = 0;
  let voidedCount = 0;

  for (const p of movements.payments) {
    if (p.status !== 'ACTIVE') {
      voidedCount++;
      continue;
    }
    const cents = toCents(p.amountPaid);
    const method = (p.paymentMethod in byMethodCents ? p.paymentMethod : 'BANK_TRANSFER') as PaymentMethodCode;
    byMethodCents[method] += cents;
    countByMethod[method] += 1;
    collected += cents;
    paymentsCount++;
  }

  let expensesCents = 0;
  let expensesCount = 0;
  for (const e of movements.expenses) {
    if (e.status !== 'ACTIVE') continue;
    expensesCents += toCents(e.amount);
    expensesCount++;
  }

  const openingCents = toCents(movements.openingAmount);
  const byMethod = emptyByMethod();
  for (const m of PAYMENT_METHODS) byMethod[m] = fromCents(byMethodCents[m]);

  return {
    byMethod,
    countByMethod,
    totalCollected: fromCents(collected),
    paymentsCount,
    voidedCount,
    expensesTotal: fromCents(expensesCents),
    expensesCount,
    openingAmount: fromCents(openingCents),
    expectedCash: fromCents(openingCents + byMethodCents.CASH - expensesCents),
  };
}

/** Diferencia de arqueo: positivo = sobrante, negativo = faltante. */
export function cashDifference(expectedCash: Money, countedCash: Money): number {
  return fromCents(toCents(countedCash) - toCents(expectedCash));
}

export function differenceLabel(difference: number): string {
  if (difference === 0) return 'Cuadrada';
  return difference > 0 ? `Sobrante de S/ ${difference.toFixed(2)}` : `Faltante de S/ ${Math.abs(difference).toFixed(2)}`;
}

/** Un egreso en efectivo no puede superar el efectivo disponible en la caja. */
export function validateExpenseAmount(availableCash: Money, amount: Money): string | null {
  const a = toCents(amount);
  if (a <= 0) return 'El monto del egreso debe ser mayor a cero.';
  const available = toCents(availableCash);
  if (a > available) {
    return `El egreso (S/ ${fromCents(a).toFixed(2)}) supera el efectivo disponible en caja (S/ ${fromCents(Math.max(0, available)).toFixed(2)}).`;
  }
  return null;
}

export const EXPENSE_CATEGORIES = [
  'UTILES_OFICINA',
  'LIMPIEZA',
  'MANTENIMIENTO',
  'MOVILIDAD',
  'REFRIGERIO',
  'SERVICIOS',
  'MATERIAL_EDUCATIVO',
  'DEVOLUCION',
  'OTROS',
] as const;

export const EXPENSE_CATEGORY_LABEL: Record<(typeof EXPENSE_CATEGORIES)[number], string> = {
  UTILES_OFICINA: 'Útiles de oficina',
  LIMPIEZA: 'Limpieza',
  MANTENIMIENTO: 'Mantenimiento y reparaciones',
  MOVILIDAD: 'Movilidad y pasajes',
  REFRIGERIO: 'Refrigerios y atenciones',
  SERVICIOS: 'Servicios (luz, agua, internet)',
  MATERIAL_EDUCATIVO: 'Material educativo',
  DEVOLUCION: 'Devolución a familia',
  OTROS: 'Otros',
};

export const EXPENSE_DOCUMENT_TYPES = ['BOLETA', 'FACTURA', 'RECIBO_HONORARIOS', 'TICKET', 'SIN_COMPROBANTE'] as const;
