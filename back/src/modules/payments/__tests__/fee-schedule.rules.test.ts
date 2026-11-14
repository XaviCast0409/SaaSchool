import { describe, expect, it } from 'vitest';
import {
  buildEnrollmentSchedule,
  existingPeriodKey,
  monthlyDueDate,
  periodForConcept,
  pickFeeSchedule,
  repriceObligation,
  scheduleTotal,
  shouldCancelOnWithdrawal,
  validateFeeTerms,
  type FeeScheduleTerms,
} from '../fee-schedule.rules';

const terms: FeeScheduleTerms = {
  enrollmentFee: '300.00',
  admissionFee: '500.00',
  monthlyFee: '450.00',
  firstMonth: 3,
  lastMonth: 12,
  dueDay: 31,
};

describe('cronograma de matrícula', () => {
  it('genera matrícula y las 10 pensiones de marzo a diciembre si se matricula antes del año', () => {
    const items = buildEnrollmentSchedule({ year: 2026, terms, condition: 'CONTINUO', enrollmentDate: '2026-01-20' });
    expect(items.map((i) => i.period)).toEqual([
      'MATRICULA-2026',
      '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12',
    ]);
    expect(items[0]).toMatchObject({ concept: 'MATRICULA', title: 'Matrícula 2026', amountDue: 300, dueDate: '2026-01-20' });
    expect(items[1]).toMatchObject({ concept: 'PENSION', title: 'Pensión Marzo 2026', amountDue: 450, dueDate: '2026-03-31' });
    expect(scheduleTotal(items)).toBe(300 + 450 * 10);
  });

  it('matricularse el año anterior genera todo el cronograma', () => {
    const items = buildEnrollmentSchedule({ year: 2026, terms, condition: 'CONTINUO', enrollmentDate: '2025-12-15' });
    expect(items.filter((i) => i.concept === 'PENSION')).toHaveLength(10);
  });

  it('el vencimiento usa el último día si el mes es más corto', () => {
    expect(monthlyDueDate(2026, 4, 31)).toBe('2026-04-30');
    expect(monthlyDueDate(2026, 2, 30)).toBe('2026-02-28');
    expect(monthlyDueDate(2028, 2, 30)).toBe('2028-02-29');
    expect(monthlyDueDate(2026, 5, 5)).toBe('2026-05-05');
    const items = buildEnrollmentSchedule({ year: 2026, terms: { ...terms, dueDay: 31 }, condition: 'CONTINUO', enrollmentDate: '2026-01-02' });
    expect(items.find((i) => i.period === '2026-06')?.dueDate).toBe('2026-06-30');
  });

  it('a mitad de año solo genera los meses restantes desde el mes de ingreso', () => {
    const items = buildEnrollmentSchedule({ year: 2026, terms: { ...terms, dueDay: 10 }, condition: 'TRASLADO', enrollmentDate: '2026-08-05' });
    const pensions = items.filter((i) => i.concept === 'PENSION');
    expect(pensions.map((p) => p.period)).toEqual(['2026-08', '2026-09', '2026-10', '2026-11', '2026-12']);
    expect(pensions[0].dueDate).toBe('2026-08-10');
  });

  it('si el vencimiento del mes de ingreso ya pasó, esa pensión vence el día de la matrícula', () => {
    const items = buildEnrollmentSchedule({ year: 2026, terms: { ...terms, dueDay: 10 }, condition: 'CONTINUO', enrollmentDate: '2026-08-20' });
    const pensions = items.filter((i) => i.concept === 'PENSION');
    expect(pensions[0]).toMatchObject({ period: '2026-08', dueDate: '2026-08-20' });
    expect(pensions[1]).toMatchObject({ period: '2026-09', dueDate: '2026-09-10' });
  });

  it('matricularse después del último mes no genera pensiones', () => {
    const items = buildEnrollmentSchedule({ year: 2026, terms, condition: 'CONTINUO', enrollmentDate: '2027-01-10' });
    expect(items.map((i) => i.concept)).toEqual(['MATRICULA']);
  });

  it('la cuota de ingreso solo se cobra a INGRESANTE', () => {
    const ingresante = buildEnrollmentSchedule({ year: 2026, terms, condition: 'INGRESANTE', enrollmentDate: '2026-02-01' });
    expect(ingresante[1]).toMatchObject({ concept: 'CUOTA_INGRESO', period: 'INGRESO-2026', amountDue: 500, dueDate: '2026-02-01' });
    for (const condition of ['CONTINUO', 'TRASLADO', 'REENTRANTE']) {
      const items = buildEnrollmentSchedule({ year: 2026, terms, condition, enrollmentDate: '2026-02-01' });
      expect(items.some((i) => i.concept === 'CUOTA_INGRESO')).toBe(false);
    }
  });

  it('omite conceptos con monto cero', () => {
    const items = buildEnrollmentSchedule({
      year: 2026,
      terms: { ...terms, enrollmentFee: 0, admissionFee: 0 },
      condition: 'INGRESANTE',
      enrollmentDate: '2026-02-01',
    });
    expect(items.every((i) => i.concept === 'PENSION')).toBe(true);
    expect(buildEnrollmentSchedule({ year: 2026, terms: { ...terms, monthlyFee: 0 }, condition: 'CONTINUO', enrollmentDate: '2026-02-01' })).toHaveLength(1);
  });

  it('respeta la pensión personalizada de la matrícula (0 = beca integral)', () => {
    const custom = buildEnrollmentSchedule({ year: 2026, terms, condition: 'CONTINUO', enrollmentDate: '2026-02-01', customPensionAmount: '350.50' });
    expect(custom.filter((i) => i.concept === 'PENSION').every((p) => p.amountDue === 350.5)).toBe(true);
    const integral = buildEnrollmentSchedule({ year: 2026, terms, condition: 'CONTINUO', enrollmentDate: '2026-02-01', customPensionAmount: 0 });
    expect(integral.map((i) => i.concept)).toEqual(['MATRICULA']);
  });
});

describe('tarifario', () => {
  it('valida meses, día de vencimiento y montos', () => {
    expect(validateFeeTerms(terms)).toBeNull();
    expect(validateFeeTerms({ ...terms, firstMonth: 0 })).toMatch(/meses/);
    expect(validateFeeTerms({ ...terms, firstMonth: 12, lastMonth: 3 })).toMatch(/posterior/);
    expect(validateFeeTerms({ ...terms, dueDay: 32 })).toMatch(/vencimiento/);
    expect(validateFeeTerms({ ...terms, monthlyFee: -1 })).toMatch(/negativos/);
  });

  it('prefiere el tarifario del grado sobre el del nivel', () => {
    const schedules = [
      { id: 'prim', educationLevel: 'PRIMARY', grade: null },
      { id: 'prim6', educationLevel: 'PRIMARY', grade: 6 },
      { id: 'sec', educationLevel: 'SECONDARY', grade: null },
    ];
    expect(pickFeeSchedule(schedules, { educationLevel: 'PRIMARY', grade: 6 })?.id).toBe('prim6');
    expect(pickFeeSchedule(schedules, { educationLevel: 'PRIMARY', grade: 2 })?.id).toBe('prim');
    expect(pickFeeSchedule(schedules, { educationLevel: 'INITIAL', grade: 4 })).toBeNull();
  });
});

describe('retiro o traslado', () => {
  it('anula solo lo que vence después del retiro, sin cobros y no anulado', () => {
    const date = '2026-06-15';
    expect(shouldCancelOnWithdrawal({ status: 'PENDING', dueDate: '2026-07-31', activePayments: 0 }, date)).toBe(true);
    expect(shouldCancelOnWithdrawal({ status: 'PENDING', dueDate: '2026-06-15', activePayments: 0 }, date)).toBe(false);
    expect(shouldCancelOnWithdrawal({ status: 'PENDING', dueDate: '2026-05-31', activePayments: 0 }, date)).toBe(false);
    expect(shouldCancelOnWithdrawal({ status: 'PARTIAL', dueDate: '2026-07-31', activePayments: 1 }, date)).toBe(false);
    expect(shouldCancelOnWithdrawal({ status: 'CANCELLED', dueDate: '2026-07-31', activePayments: 0 }, date)).toBe(false);
  });
});

describe('periodo de cuotas en lote', () => {
  it('pensión por mes de vencimiento, matrícula e ingreso por año, extras sin periodo', () => {
    expect(periodForConcept('PENSION', '2026-03-31', 2026)).toBe('2026-03');
    expect(periodForConcept('MATRICULA', '2025-12-20', 2026)).toBe('MATRICULA-2026');
    expect(periodForConcept('CUOTA_INGRESO', '2026-02-01', 2026)).toBe('INGRESO-2026');
    expect(periodForConcept('UNIFORME', '2026-03-31', 2026)).toBeNull();
  });
});

describe('cuotas existentes al completar el cronograma', () => {
  it('usa el periodo guardado o lo deduce del concepto y vencimiento', () => {
    expect(existingPeriodKey({ concept: 'PENSION', period: '2026-04', dueDate: '2026-05-02' }, 2026)).toBe('2026-04');
    expect(existingPeriodKey({ concept: 'PENSION', period: null, dueDate: '2026-05-31' }, 2026)).toBe('2026-05');
    expect(existingPeriodKey({ concept: 'MATRICULA', period: null, dueDate: '2025-12-15' }, 2026)).toBe('MATRICULA-2026');
    expect(existingPeriodKey({ concept: 'UNIFORME', period: null, dueDate: '2026-03-01' }, 2026)).toBeNull();
  });
});

describe('editar el tarifario actualiza cuotas pendientes', () => {
  const t = { ...terms, monthlyFee: '480.00', enrollmentFee: '320', admissionFee: 0, dueDay: 15 };
  it('pensión: monto y día nuevos; matrícula: solo monto', () => {
    expect(repriceObligation({ concept: 'PENSION', period: '2026-04', amountDue: '450', dueDate: '2026-04-30' }, t, '2026-01-10')).toEqual({
      amountDue: 480,
      dueDate: '2026-04-15',
    });
    expect(repriceObligation({ concept: 'MATRICULA', period: 'MATRICULA-2026', amountDue: 300, dueDate: '2026-01-10' }, t, '2026-01-10')).toEqual({
      amountDue: 320,
      dueDate: '2026-01-10',
    });
  });
  it('no adelanta el vencimiento antes de la matrícula', () => {
    expect(repriceObligation({ concept: 'PENSION', period: '2026-08', amountDue: 450, dueDate: '2026-08-20' }, t, '2026-08-20')?.dueDate).toBe('2026-08-20');
  });
  it('sin cambios, monto cero u otros conceptos: no toca', () => {
    expect(repriceObligation({ concept: 'PENSION', period: '2026-04', amountDue: 480, dueDate: '2026-04-15' }, t, '2026-01-10')).toBeNull();
    expect(repriceObligation({ concept: 'CUOTA_INGRESO', period: 'INGRESO-2026', amountDue: 500, dueDate: '2026-01-10' }, t, '2026-01-10')).toBeNull();
    expect(repriceObligation({ concept: 'UNIFORME', period: null, amountDue: 90, dueDate: '2026-03-01' }, t, '2026-01-10')).toBeNull();
  });
});
