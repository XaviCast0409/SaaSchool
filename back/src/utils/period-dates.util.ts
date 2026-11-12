/**
 * Helper reutilizable para cálculo exacto de rangos de fechas por Periodo (Bimestre / Trimestre)
 * según configuración del año académico (RVM N° 094-2020-MINEDU).
 */

export interface PeriodDateRange {
  startDate: Date;
  endDate: Date;
}

export function getPeriodDateRange(
  academicYear: {
    startDate: Date | string;
    endDate: Date | string;
    periodType?: string | null;
    periodsConfig?: any;
  },
  periodNumber: number,
): PeriodDateRange {
  // 1. Si periodsConfig está definido y contiene las fechas de periodNumber
  if (academicYear.periodsConfig && Array.isArray(academicYear.periodsConfig)) {
    const config = academicYear.periodsConfig.find(
      (p: any) => Number(p.periodNumber) === Number(periodNumber),
    );
    if (config?.startDate && config?.endDate) {
      const s = new Date(config.startDate);
      const e = new Date(config.endDate);
      // Asegurar que abarque el final del día en endDate
      if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
        e.setUTCHours(23, 59, 59, 999);
        return { startDate: s, endDate: e };
      }
    }
  }

  // 2. Si periodsConfig es null o no tiene la fecha, dividir matemáticamente entre startDate y endDate
  const startMs = new Date(academicYear.startDate).getTime();
  const endMs = new Date(academicYear.endDate).getTime();
  const isTrimester = (academicYear.periodType || '').toUpperCase() === 'TRIMESTER';
  const maxPeriods = isTrimester ? 3 : 4;
  const clampedPeriod = Math.max(1, Math.min(maxPeriods, periodNumber));

  const totalDuration = Math.max(0, endMs - startMs);
  const chunk = totalDuration / maxPeriods;

  const pStartMs = startMs + (clampedPeriod - 1) * chunk;
  const pEndMs = clampedPeriod === maxPeriods ? endMs : startMs + clampedPeriod * chunk;

  const s = new Date(pStartMs);
  const e = new Date(pEndMs);
  e.setUTCHours(23, 59, 59, 999);

  return {
    startDate: s,
    endDate: e,
  };
}

