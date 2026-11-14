import { addDays } from '../automations/automation.rules';
import { nationalHolidays } from '../calendar/official-dates';

/**
 * Reglas puras de Secretaría: admisión, trámites y Libro de Reclamaciones.
 * Sin acceso a base de datos para poder probarlas de forma aislada.
 */

export const ADMISSION_STATUSES = ['NEW', 'INTERVIEW', 'ADMITTED', 'ENROLLED', 'REJECTED', 'WITHDRAWN'] as const;
export type AdmissionStatus = (typeof ADMISSION_STATUSES)[number];

/** Cambios de estado permitidos en el embudo de admisión (ENROLLED solo se alcanza al convertir). */
const ADMISSION_FLOW: Record<AdmissionStatus, AdmissionStatus[]> = {
  NEW: ['INTERVIEW', 'ADMITTED', 'REJECTED', 'WITHDRAWN'],
  INTERVIEW: ['NEW', 'ADMITTED', 'REJECTED', 'WITHDRAWN'],
  ADMITTED: ['INTERVIEW', 'REJECTED', 'WITHDRAWN'],
  REJECTED: ['NEW', 'INTERVIEW'],
  WITHDRAWN: ['NEW'],
  ENROLLED: [],
};

export function canMoveAdmission(from: AdmissionStatus, to: AdmissionStatus): boolean {
  return ADMISSION_FLOW[from].includes(to);
}

/** Grados válidos por nivel. En Inicial el "grado" es la edad (3, 4 o 5 años). */
export function isValidGrade(level: 'INITIAL' | 'PRIMARY' | 'SECONDARY', grade: number): boolean {
  if (!Number.isInteger(grade)) return false;
  if (level === 'INITIAL') return grade >= 3 && grade <= 5;
  if (level === 'PRIMARY') return grade >= 1 && grade <= 6;
  return grade >= 1 && grade <= 5;
}

export function gradeLabel(level: string, grade: number): string {
  if (level === 'INITIAL') return `Inicial ${grade} años`;
  return `${grade}.° de ${level === 'PRIMARY' ? 'Primaria' : 'Secundaria'}`;
}

// ------------------------------------------------------------------ Trámites

export const DOCUMENT_TYPES = [
  'CONSTANCIA_ESTUDIOS',
  'CONSTANCIA_MATRICULA',
  'CONSTANCIA_CONDUCTA',
  'CONSTANCIA_NO_ADEUDO',
  'CERTIFICADO_ESTUDIOS',
  'LIBRETA_NOTAS',
  'OTRO',
] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_LABEL: Record<DocumentType, string> = {
  CONSTANCIA_ESTUDIOS: 'Constancia de estudios',
  CONSTANCIA_MATRICULA: 'Constancia de matrícula',
  CONSTANCIA_CONDUCTA: 'Constancia de conducta',
  CONSTANCIA_NO_ADEUDO: 'Constancia de no adeudo',
  CERTIFICADO_ESTUDIOS: 'Certificado de estudios',
  LIBRETA_NOTAS: 'Copia de libreta de notas',
  OTRO: 'Otro documento',
};

export const DOCUMENT_STATUSES = ['REQUESTED', 'IN_PROCESS', 'READY', 'DELIVERED', 'REJECTED'] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

const DOCUMENT_FLOW: Record<DocumentStatus, DocumentStatus[]> = {
  REQUESTED: ['IN_PROCESS', 'READY', 'REJECTED'],
  IN_PROCESS: ['READY', 'REJECTED', 'REQUESTED'],
  READY: ['DELIVERED', 'IN_PROCESS'],
  DELIVERED: [],
  REJECTED: ['REQUESTED'],
};

export function canMoveDocument(from: DocumentStatus, to: DocumentStatus): boolean {
  return DOCUMENT_FLOW[from].includes(to);
}

/**
 * Ley 27665: por deuda de pensiones el colegio solo puede retener los certificados de estudios
 * de los periodos no pagados. Nunca constancias, libretas ni ningún otro trámite.
 */
export function debtHoldApplies(type: DocumentType, overdueAmount: number): boolean {
  return type === 'CERTIFICADO_ESTUDIOS' && overdueAmount > 0;
}

// ------------------------------------------------------------------ Libro de Reclamaciones

/** Correlativo legible: RCL-2026-000001. */
export function complaintCode(year: number, counter: number): string {
  return `RCL-${year}-${String(counter).padStart(6, '0')}`;
}

/**
 * Suma días hábiles (lunes a viernes, sin feriados nacionales) a una fecha 'YYYY-MM-DD'.
 * El Código de Protección al Consumidor da 15 días hábiles para responder un reclamo.
 */
export function addBusinessDays(dateStr: string, days: number): string {
  const holidays = new Set<string>();
  const y = Number(dateStr.slice(0, 4));
  for (const year of [y, y + 1]) for (const h of nationalHolidays(year)) holidays.add(h.date);
  let current = dateStr;
  let added = 0;
  while (added < days) {
    current = addDays(current, 1);
    const dow = new Date(`${current}T00:00:00.000Z`).getUTCDay();
    if (dow !== 0 && dow !== 6 && !holidays.has(current)) added++;
  }
  return current;
}

/** Días calendario hasta el vencimiento (negativo si ya venció). */
export function daysUntil(today: string, due: string): number {
  return Math.round((Date.parse(`${due}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
}

/** Campo trampa: los humanos no lo ven; si viene con texto es un bot. */
export function isLikelyBot(honeypot: unknown): boolean {
  return typeof honeypot === 'string' && honeypot.trim().length > 0;
}
