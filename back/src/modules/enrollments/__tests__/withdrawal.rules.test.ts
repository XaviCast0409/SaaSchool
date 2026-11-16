import { describe, expect, it } from 'vitest';
import { attendsOn, completedPeriods, countsInPeriod, lastStudyDay } from '../withdrawal.rules';

const year = {
  startDate: '2026-03-02',
  endDate: '2026-12-18',
  periodType: 'BIMESTER',
  periodsConfig: [
    { periodNumber: 1, name: 'I Bimestre', startDate: '2026-03-02', endDate: '2026-05-08' },
    { periodNumber: 2, name: 'II Bimestre', startDate: '2026-05-18', endDate: '2026-07-24' },
    { periodNumber: 3, name: 'III Bimestre', startDate: '2026-08-10', endDate: '2026-10-09' },
    { periodNumber: 4, name: 'IV Bimestre', startDate: '2026-10-19', endDate: '2026-12-18' },
  ],
};

describe('retiro a mitad de año: periodos que cuentan', () => {
  it('un alumno matriculado cuenta en todos los periodos', () => {
    const enr = { enrollmentState: 'REGISTERED', withdrawalDate: null };
    expect(completedPeriods(enr, year, 4)).toEqual([1, 2, 3, 4]);
  });

  it('si se retira durante el 2.º bimestre, solo cuenta el 1.º', () => {
    const enr = { enrollmentState: 'WITHDRAWN', withdrawalDate: new Date('2026-06-15T00:00:00Z') };
    expect(countsInPeriod(enr, year, 1)).toBe(true);
    expect(countsInPeriod(enr, year, 2)).toBe(false);
    expect(completedPeriods(enr, year, 4)).toEqual([1]);
  });

  it('si se retira el último día del bimestre, ese bimestre sí cuenta', () => {
    const enr = { enrollmentState: 'TRANSFERRED', withdrawalDate: '2026-07-24' };
    expect(completedPeriods(enr, year, 4)).toEqual([1, 2]);
  });

  it('en vacaciones entre bimestres cuenta el bimestre ya terminado', () => {
    const enr = { enrollmentState: 'WITHDRAWN', withdrawalDate: '2026-05-12' };
    expect(completedPeriods(enr, year, 4)).toEqual([1]);
  });

  it('retiro sin fecha (datos antiguos): no cuenta en ningún periodo', () => {
    const enr = { enrollmentState: 'WITHDRAWN', withdrawalDate: null };
    expect(completedPeriods(enr, year, 4)).toEqual([]);
    expect(lastStudyDay(enr)).toBeNull();
  });

  it('sin fechas configuradas usa la división del año en partes iguales', () => {
    const plain = { startDate: '2026-03-01', endDate: '2026-12-31', periodType: 'BIMESTER', periodsConfig: null };
    const enr = { enrollmentState: 'WITHDRAWN', withdrawalDate: '2026-09-01' };
    // 4 partes iguales de mar–dic: el 2.º bimestre termina a fines de julio
    expect(completedPeriods(enr, plain, 4)).toEqual([1, 2]);
  });
});

describe('retiro a mitad de año: asistencia', () => {
  const enr = { enrollmentState: 'WITHDRAWN', withdrawalDate: new Date('2026-06-15T00:00:00Z') };

  it('se puede registrar hasta el último día que estudió, inclusive', () => {
    expect(attendsOn(enr, '2026-06-14')).toBe(true);
    expect(attendsOn(enr, '2026-06-15')).toBe(true);
    expect(attendsOn(enr, '2026-06-16')).toBe(false);
  });

  it('un matriculado asiste cualquier día; un retirado sin fecha, ninguno', () => {
    expect(attendsOn({ enrollmentState: 'REGISTERED' }, '2026-12-01')).toBe(true);
    expect(attendsOn({ enrollmentState: 'WITHDRAWN', withdrawalDate: null }, '2026-03-05')).toBe(false);
  });
});
