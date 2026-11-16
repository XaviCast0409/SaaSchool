import { getPeriodDateRange } from '../../utils/period-dates.util';

/**
 * Reglas del retiro / traslado de un alumno a mitad de año.
 *
 * `withdrawalDate` es el último día que el alumno estudió en el colegio. Con esa fecha:
 *  - Un periodo (bimestre/trimestre) cuenta para notas y SIAGIE solo si terminó hasta ese día
 *    (el alumno lo completó). El periodo en el que se retira y los siguientes ya no cuentan.
 *  - La asistencia se puede registrar hasta ese día inclusive.
 * Una matrícula retirada o trasladada sin fecha (datos antiguos) no cuenta en ningún periodo ni día,
 * igual que antes.
 */

export interface WithdrawableEnrollment {
  enrollmentState: string;
  withdrawalDate?: Date | string | null;
}

export interface YearForPeriods {
  startDate: Date | string;
  endDate: Date | string;
  periodType?: string | null;
  periodsConfig?: unknown;
}

const isoDay = (d: Date | string): string => (typeof d === 'string' ? d.slice(0, 10) : d.toISOString().slice(0, 10));

/** Último día que el alumno estudió (AAAA-MM-DD), o null si sigue matriculado o no tiene fecha. */
export function lastStudyDay(enr: WithdrawableEnrollment): string | null {
  if (enr.enrollmentState === 'REGISTERED' || !enr.withdrawalDate) return null;
  return isoDay(enr.withdrawalDate);
}

/** ¿El alumno cuenta en este periodo? (notas, consolidado, plantilla del SIAGIE) */
export function countsInPeriod(enr: WithdrawableEnrollment, year: YearForPeriods, periodNumber: number): boolean {
  if (enr.enrollmentState === 'REGISTERED') return true;
  const last = lastStudyDay(enr);
  if (!last) return false;
  const periodEnd = isoDay(getPeriodDateRange(year as Parameters<typeof getPeriodDateRange>[0], periodNumber).endDate);
  return periodEnd <= last;
}

/** ¿El alumno estaba en el colegio ese día? (asistencia) */
export function attendsOn(enr: WithdrawableEnrollment, dateStr: string): boolean {
  if (enr.enrollmentState === 'REGISTERED') return true;
  const last = lastStudyDay(enr);
  return !!last && dateStr.slice(0, 10) <= last;
}

/** Periodos del año que el alumno completó antes de retirarse (para mostrarlo en la interfaz). */
export function completedPeriods(enr: WithdrawableEnrollment, year: YearForPeriods, totalPeriods: number): number[] {
  return Array.from({ length: totalPeriods }, (_, i) => i + 1).filter((n) => countsInPeriod(enr, year, n));
}
