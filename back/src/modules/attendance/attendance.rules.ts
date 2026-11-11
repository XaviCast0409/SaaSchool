import type { AttendanceStatus, EducationLevel } from '@prisma/client';

export type ScheduleScope = 'GENERAL' | 'INITIAL' | 'PRIMARY' | 'SECONDARY';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Día de la semana (0 = domingo) según la hora de Lima, independiente de la zona del servidor. */
export function limaWeekday(date: Date = new Date()): number {
  const short = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Lima', weekday: 'short' }).format(date);
  return WEEKDAYS.indexOf(short);
}

/**
 * Niveles educativos que cierra un horario.
 * - Un horario de nivel (INITIAL/PRIMARY/SECONDARY) cierra solo ese nivel (si el colegio lo ofrece).
 * - El horario GENERAL cierra los niveles ofrecidos que NO tienen horario propio.
 */
export function levelsForScope(
  scope: ScheduleScope,
  offeredLevels: EducationLevel[],
  configuredScopes: ScheduleScope[],
): EducationLevel[] {
  if (scope !== 'GENERAL') {
    return offeredLevels.includes(scope as EducationLevel) ? [scope as EducationLevel] : [];
  }
  return offeredLevels.filter((level) => !configuredScopes.includes(level as ScheduleScope));
}

/** Lista de días lectivos (lunes a viernes, sin feriados) entre dos fechas YYYY-MM-DD, ambas inclusive. */
export function expandSchoolDays(fromStr: string, toStr: string, holidayStrs: Set<string>): string[] {
  const result: string[] = [];
  const cursor = new Date(`${fromStr}T00:00:00.000Z`);
  const end = new Date(`${toStr}T00:00:00.000Z`);
  while (cursor.getTime() <= end.getTime()) {
    const day = cursor.getUTCDay();
    const iso = cursor.toISOString().slice(0, 10);
    if (day !== 0 && day !== 6 && !holidayStrs.has(iso)) result.push(iso);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return result;
}

/** Diferencia en días entre dos fechas YYYY-MM-DD (to - from). */
export function daysBetween(fromStr: string, toStr: string): number {
  return Math.round(
    (new Date(`${toStr}T00:00:00.000Z`).getTime() - new Date(`${fromStr}T00:00:00.000Z`).getTime()) / 86_400_000,
  );
}

export interface RiskThresholds {
  consecutive: number;
  monthlyPercent: number;
  lateCount: number;
}

export interface DailyRecord {
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
}

export type RiskReason = 'CONSECUTIVE_ABSENCES' | 'MONTHLY_ABSENCE_RATE' | 'REPEATED_LATENESS';

export interface RiskSignal {
  reason: RiskReason;
  metricValue: number;
  threshold: number;
}

/**
 * Señales de riesgo a partir de los registros de los últimos 30 días.
 * Solo cuentan faltas y tardanzas INJUSTIFICADAS (las justificadas no generan alerta).
 */
export function computeRiskSignals(records: DailyRecord[], t: RiskThresholds, minDaysForRate = 5): RiskSignal[] {
  const signals: RiskSignal[] = [];
  const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date));

  let consecutive = 0;
  for (const record of sorted) {
    if (record.status === 'ABSENT_UNJUSTIFIED') consecutive++;
    else break;
  }
  if (consecutive >= t.consecutive) {
    signals.push({ reason: 'CONSECUTIVE_ABSENCES', metricValue: consecutive, threshold: t.consecutive });
  }

  if (records.length >= minDaysForRate) {
    const absences = records.filter((r) => r.status === 'ABSENT_UNJUSTIFIED').length;
    const rate = Math.round((absences * 1000) / records.length) / 10;
    if (rate >= t.monthlyPercent) {
      signals.push({ reason: 'MONTHLY_ABSENCE_RATE', metricValue: rate, threshold: t.monthlyPercent });
    }
  }

  const lates = records.filter((r) => r.status === 'LATE_UNJUSTIFIED').length;
  if (lates >= t.lateCount) {
    signals.push({ reason: 'REPEATED_LATENESS', metricValue: lates, threshold: t.lateCount });
  }

  return signals;
}

export const RISK_REASON_LABELS: Record<RiskReason, string> = {
  CONSECUTIVE_ABSENCES: 'Faltas injustificadas consecutivas',
  MONTHLY_ABSENCE_RATE: '% de faltas injustificadas (últimos 30 días)',
  REPEATED_LATENESS: 'Tardanzas injustificadas repetidas (últimos 30 días)',
};
