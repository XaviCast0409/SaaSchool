/**
 * Reglas puras del cronograma de cuotas que se genera al matricular (sin base de datos).
 * Las fechas son de solo día ('YYYY-MM-DD'); los montos se manejan en céntimos.
 */
import { fromCents, toCents } from './payment.rules';

type Money = number | string | { toString(): string };

export const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
] as const;

export type ScheduleConcept = 'MATRICULA' | 'CUOTA_INGRESO' | 'PENSION';

export interface FeeScheduleTerms {
  enrollmentFee: Money;
  admissionFee: Money;
  monthlyFee: Money;
  firstMonth: number;
  lastMonth: number;
  dueDay: number;
}

export interface PlannedObligation {
  concept: ScheduleConcept;
  /** Clave única por matrícula y concepto: '2026-03', 'MATRICULA-2026', 'INGRESO-2026'. */
  period: string;
  title: string;
  amountDue: number;
  /** 'YYYY-MM-DD' */
  dueDate: string;
}

export const pensionPeriod = (year: number, month: number) => `${year}-${String(month).padStart(2, '0')}`;
export const enrollmentPeriod = (year: number) => `MATRICULA-${year}`;
export const admissionPeriod = (year: number) => `INGRESO-${year}`;

const daysInMonth = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();

/** Vencimiento del mes: el día configurado o, si el mes es más corto, su último día. */
export function monthlyDueDate(year: number, month: number, dueDay: number): string {
  const day = Math.min(Math.max(1, dueDay), daysInMonth(year, month));
  return `${pensionPeriod(year, month)}-${String(day).padStart(2, '0')}`;
}

/** Valida los términos del tarifario; devuelve un mensaje de error o null. */
export function validateFeeTerms(t: FeeScheduleTerms): string | null {
  const months = [t.firstMonth, t.lastMonth];
  if (months.some((m) => !Number.isInteger(m) || m < 1 || m > 12)) return 'Los meses deben estar entre enero (1) y diciembre (12).';
  if (t.firstMonth > t.lastMonth) return 'El primer mes de pensión no puede ser posterior al último.';
  if (!Number.isInteger(t.dueDay) || t.dueDay < 1 || t.dueDay > 31) return 'El día de vencimiento debe estar entre 1 y 31.';
  if ([t.enrollmentFee, t.admissionFee, t.monthlyFee].some((v) => toCents(v) < 0)) return 'Los montos no pueden ser negativos.';
  return null;
}

/** Elige el tarifario de un aula: el de su grado tiene prioridad sobre el del nivel completo. */
export function pickFeeSchedule<T extends { educationLevel: string; grade: number | null }>(
  schedules: T[],
  classroom: { educationLevel: string; grade: number },
): T | null {
  const sameLevel = schedules.filter((s) => s.educationLevel === classroom.educationLevel);
  return sameLevel.find((s) => s.grade === classroom.grade) ?? sameLevel.find((s) => s.grade === null) ?? null;
}

/**
 * Cronograma de una matrícula:
 * - Matrícula (si tiene monto), vence el día en que se matricula.
 * - Cuota de ingreso solo para la condición INGRESANTE (si tiene monto), vence el mismo día.
 * - Pensiones del primer al último mes del tarifario; si se matricula a mitad de año, solo desde
 *   el mes de ingreso. Si el vencimiento de su primer mes ya pasó, vence el día de la matrícula.
 * - `customPensionAmount` (pensión personalizada de la matrícula) reemplaza la pensión del
 *   tarifario; 0 = beca integral y no se generan pensiones.
 */
export function buildEnrollmentSchedule(input: {
  year: number;
  terms: FeeScheduleTerms;
  condition: string;
  /** 'YYYY-MM-DD' (fecha de Lima) */
  enrollmentDate: string;
  customPensionAmount?: Money | null;
}): PlannedObligation[] {
  const { year, terms, condition, enrollmentDate } = input;
  const items: PlannedObligation[] = [];

  const enrollmentCents = toCents(terms.enrollmentFee);
  if (enrollmentCents > 0) {
    items.push({
      concept: 'MATRICULA',
      period: enrollmentPeriod(year),
      title: `Matrícula ${year}`,
      amountDue: fromCents(enrollmentCents),
      dueDate: enrollmentDate,
    });
  }

  const admissionCents = toCents(terms.admissionFee);
  if (condition === 'INGRESANTE' && admissionCents > 0) {
    items.push({
      concept: 'CUOTA_INGRESO',
      period: admissionPeriod(year),
      title: `Cuota de ingreso ${year}`,
      amountDue: fromCents(admissionCents),
      dueDate: enrollmentDate,
    });
  }

  const pensionCents =
    input.customPensionAmount !== null && input.customPensionAmount !== undefined
      ? toCents(input.customPensionAmount)
      : toCents(terms.monthlyFee);
  if (pensionCents <= 0) return items;

  const [entryYear, entryMonth] = enrollmentDate.split('-').map(Number);
  let startMonth: number;
  if (entryYear < year) startMonth = terms.firstMonth;
  else if (entryYear === year) startMonth = Math.max(terms.firstMonth, entryMonth);
  else return items; // Matrícula registrada después del año escolar: sin pensiones

  for (let m = startMonth; m <= terms.lastMonth; m++) {
    const due = monthlyDueDate(year, m, terms.dueDay);
    items.push({
      concept: 'PENSION',
      period: pensionPeriod(year, m),
      title: `Pensión ${MONTH_NAMES[m - 1]} ${year}`,
      amountDue: fromCents(pensionCents),
      dueDate: due < enrollmentDate ? enrollmentDate : due,
    });
  }
  return items;
}

/** Total del cronograma en soles. */
export function scheduleTotal(items: Array<{ amountDue: number }>): number {
  return fromCents(items.reduce((acc, i) => acc + toCents(i.amountDue), 0));
}

/**
 * Cuotas que se anulan al retirar o trasladar: las que vencen después de la fecha de retiro,
 * no están anuladas y no tienen cobros vigentes. La deuda anterior se mantiene.
 */
export function shouldCancelOnWithdrawal(
  ob: { status: string; dueDate: string; activePayments: number },
  withdrawalDate: string,
): boolean {
  return ob.status !== 'CANCELLED' && ob.activePayments === 0 && ob.dueDate > withdrawalDate;
}

/**
 * Periodo de una cuota creada en lote: pensión → mes del vencimiento ('2026-03'); matrícula y
 * cuota de ingreso → su año académico. Los cargos extra no tienen periodo (se deduplican por título).
 */
export function periodForConcept(concept: string, dueDate: string, academicYear: number): string | null {
  if (concept === 'PENSION') return dueDate.slice(0, 7);
  if (concept === 'MATRICULA') return enrollmentPeriod(academicYear);
  if (concept === 'CUOTA_INGRESO') return admissionPeriod(academicYear);
  return null;
}

/**
 * Periodo que ocupa una cuota ya existente: su `period`, o el que le corresponde por concepto y
 * vencimiento si es antigua o se creó a mano sin periodo. Sirve para no duplicar al completar.
 */
export function existingPeriodKey(ob: { concept: string; period: string | null; dueDate: string }, academicYear: number): string | null {
  return ob.period ?? periodForConcept(ob.concept, ob.dueDate, academicYear);
}

/**
 * Nuevo monto y vencimiento de una cuota pendiente del cronograma cuando se edita el tarifario.
 * Pensión: pensión mensual y día de vencimiento nuevos (nunca antes del día de matrícula).
 * Matrícula y cuota de ingreso: solo el monto. null si no cambia nada o el monto nuevo es 0
 * (una cuota en cero se anula a mano, no se reprecia en silencio).
 */
export function repriceObligation(
  ob: { concept: string; period: string | null; amountDue: Money; dueDate: string },
  terms: FeeScheduleTerms,
  enrollmentDate: string,
): { amountDue: number; dueDate: string } | null {
  let amount: Money;
  let due = ob.dueDate;
  if (ob.concept === 'PENSION' && ob.period && /^\d{4}-\d{2}$/.test(ob.period)) {
    const [y, m] = ob.period.split('-').map(Number);
    amount = terms.monthlyFee;
    const computed = monthlyDueDate(y, m, terms.dueDay);
    due = computed < enrollmentDate ? enrollmentDate : computed;
  } else if (ob.concept === 'MATRICULA') amount = terms.enrollmentFee;
  else if (ob.concept === 'CUOTA_INGRESO') amount = terms.admissionFee;
  else return null;
  const cents = toCents(amount);
  if (cents <= 0) return null;
  if (cents === toCents(ob.amountDue) && due === ob.dueDate) return null;
  return { amountDue: fromCents(cents), dueDate: due };
}
