/**
 * Reglas puras del historial de docentes de un curso (reemplazos a mitad de año), sin base de datos.
 * Las fechas son de solo día ('YYYY-MM-DD').
 */

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'];

export interface TeacherSpan {
  teacherName: string;
  fromDate: string;
  toDate: string | null;
}

export interface PeriodRange {
  periodNumber: number;
  startDate: string;
  endDate: string;
}

/** Día anterior a una fecha 'YYYY-MM-DD' (cierre del tramo del docente saliente). */
export function dayBefore(date: string): string {
  const d = new Date(`${date}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** Periodos que tocan el tramo [from, to] de un docente. */
export function periodsCovered(span: { fromDate: string; toDate: string | null }, periods: PeriodRange[]): number[] {
  return periods
    .filter((p) => p.startDate <= (span.toDate ?? '9999-12-31') && p.endDate >= span.fromDate)
    .map((p) => p.periodNumber)
    .sort((a, b) => a - b);
}

const rangeLabel = (nums: number[]) => {
  if (nums.length === 0) return '';
  const first = ROMAN[nums[0] - 1] ?? String(nums[0]);
  const last = ROMAN[nums[nums.length - 1] - 1] ?? String(nums[nums.length - 1]);
  return nums.length === 1 ? first : `${first}–${last}`;
};

const ddmm = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}`;

/**
 * Nombre del docente para actas y libretas. Con un solo docente, su nombre. Con varios (reemplazo),
 * cada uno con los periodos que le tocaron: "Ana Pérez (I–II) · Luis Ríos (III–IV)". Sin fechas de
 * periodos configuradas, con fechas: "Ana Pérez (hasta 14/06) · Luis Ríos (desde 15/06)".
 * Se omiten tramos que no tocan ningún periodo (p. ej. un cambio antes de empezar las clases).
 */
export function teacherLabel(spans: TeacherSpan[], periods: PeriodRange[], fallbackName: string): string {
  const sorted = [...spans].sort((a, b) => a.fromDate.localeCompare(b.fromDate));
  if (sorted.length <= 1) return sorted[0]?.teacherName ?? fallbackName;
  if (periods.length > 0) {
    const parts = sorted
      .map((s) => ({ name: s.teacherName, nums: periodsCovered(s, periods) }))
      .filter((s) => s.nums.length > 0);
    if (parts.length <= 1) return parts[0]?.name ?? fallbackName;
    return parts.map((s) => `${s.name} (${rangeLabel(s.nums)})`).join(' · ');
  }
  return sorted
    .map((s, i) => (i === 0 ? `${s.teacherName} (hasta ${ddmm(s.toDate ?? s.fromDate)})` : `${s.teacherName} (desde ${ddmm(s.fromDate)})`))
    .join(' · ');
}

/** Valida los datos de un reemplazo; devuelve un mensaje de error o null. */
export function validateReplacement(input: {
  outgoingTeacherId: string;
  incomingTeacherId: string;
  kind: 'PERMANENT' | 'TEMPORARY';
  effectiveDate: string;
  untilDate?: string | null;
  outgoingAction: 'KEEP' | 'REMOVE_FROM_YEAR' | 'DEACTIVATE';
}): string | null {
  if (input.outgoingTeacherId === input.incomingTeacherId) return 'El docente entrante debe ser distinto al saliente.';
  if (input.kind === 'TEMPORARY') {
    if (!input.untilDate) return 'Indica hasta cuándo dura el reemplazo temporal.';
    if (input.untilDate < input.effectiveDate) return 'La fecha de fin no puede ser anterior a la de inicio.';
    if (input.outgoingAction !== 'KEEP') return 'En un reemplazo temporal el titular sigue en el colegio: no se puede quitar ni desactivar.';
  }
  return null;
}
