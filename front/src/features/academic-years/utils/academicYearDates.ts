import { formatPeruDate } from '@/lib/dateUtils';
import type { PeriodDateConfig } from '../api/useAcademicYears';

export function formatDateDisplay(dateString: string): string {
  if (!dateString) return '──';
  try {
    return formatPeruDate(dateString, { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateString;
  }
}

export function formatDateInput(dateString: string): string {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    return d.toISOString().split('T')[0];
  } catch {
    return '';
  }
}

export function getDefaultPeriods(periodType: 'BIMESTER' | 'TRIMESTER', year: number): PeriodDateConfig[] {
  if (periodType === 'TRIMESTER') {
    return [
      { periodNumber: 1, name: '1° Trimestre', startDate: `${year}-03-01`, endDate: `${year}-05-31` },
      { periodNumber: 2, name: '2° Trimestre', startDate: `${year}-06-01`, endDate: `${year}-08-31` },
      { periodNumber: 3, name: '3° Trimestre', startDate: `${year}-09-01`, endDate: `${year}-12-20` },
    ];
  }
  return [
    { periodNumber: 1, name: '1° Bimestre', startDate: `${year}-03-01`, endDate: `${year}-05-15` },
    { periodNumber: 2, name: '2° Bimestre', startDate: `${year}-05-16`, endDate: `${year}-07-25` },
    { periodNumber: 3, name: '3° Bimestre', startDate: `${year}-08-10`, endDate: `${year}-10-15` },
    { periodNumber: 4, name: '4° Bimestre', startDate: `${year}-10-16`, endDate: `${year}-12-20` },
  ];
}

/** Mueve una fecha YYYY-MM-DD al mismo día y mes de otro año (29/02 pasa a 28/02 si hace falta). */
export function moveToYear(dateString: string, fromYear: number, toYear: number): string {
  if (!dateString) return dateString;
  const [y, m, d] = dateString.slice(0, 10).split('-').map(Number);
  const targetYear = y + (toYear - fromYear);
  const lastDay = new Date(Date.UTC(targetYear, m, 0)).getUTCDate();
  return `${targetYear}-${String(m).padStart(2, '0')}-${String(Math.min(d, lastDay)).padStart(2, '0')}`;
}

/**
 * Al cambiar el número del año, el nombre y todas las fechas lo acompañan: así no se puede
 * guardar «2026» con nombre y periodos de 2027 por olvido.
 */
export function withYear<
  T extends { year: number; name: string; startDate: string; endDate: string; periodsConfig: PeriodDateConfig[] },
>(form: T, nextYear: number): T {
  const prevYear = form.year;
  if (!nextYear || nextYear < 2000 || nextYear > 2100 || !prevYear || nextYear === prevYear)
    return { ...form, year: nextYear };
  const autoName = !form.name.trim() || /^Año Escolar \d{4}$/.test(form.name.trim());
  return {
    ...form,
    year: nextYear,
    name: autoName ? `Año Escolar ${nextYear}` : form.name.replace(String(prevYear), String(nextYear)),
    startDate: moveToYear(form.startDate, prevYear, nextYear),
    endDate: moveToYear(form.endDate, prevYear, nextYear),
    periodsConfig: form.periodsConfig.map((p) => ({
      ...p,
      startDate: moveToYear(p.startDate, prevYear, nextYear),
      endDate: moveToYear(p.endDate, prevYear, nextYear),
    })),
  };
}
