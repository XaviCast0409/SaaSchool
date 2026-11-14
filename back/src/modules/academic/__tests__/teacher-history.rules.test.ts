import { describe, expect, it } from 'vitest';
import { dayBefore, periodsCovered, teacherLabel, validateReplacement } from '../teacher-history.rules';

const bimesters = [
  { periodNumber: 1, startDate: '2026-03-09', endDate: '2026-05-08' },
  { periodNumber: 2, startDate: '2026-05-18', endDate: '2026-07-17' },
  { periodNumber: 3, startDate: '2026-08-03', endDate: '2026-10-02' },
  { periodNumber: 4, startDate: '2026-10-12', endDate: '2026-12-18' },
];

describe('historial de docentes', () => {
  it('el tramo saliente termina el día anterior al reemplazo', () => {
    expect(dayBefore('2026-08-03')).toBe('2026-08-02');
    expect(dayBefore('2026-03-01')).toBe('2026-02-28');
  });

  it('periodos que tocó cada docente', () => {
    expect(periodsCovered({ fromDate: '2026-03-01', toDate: '2026-08-02' }, bimesters)).toEqual([1, 2]);
    expect(periodsCovered({ fromDate: '2026-08-03', toDate: null }, bimesters)).toEqual([3, 4]);
    // Cambio a mitad de bimestre: el bimestre cuenta para ambos
    expect(periodsCovered({ fromDate: '2026-03-01', toDate: '2026-09-14' }, bimesters)).toEqual([1, 2, 3]);
  });

  it('un solo docente: solo su nombre', () => {
    expect(teacherLabel([{ teacherName: 'Ana Pérez', fromDate: '2026-03-01', toDate: null }], bimesters, 'X')).toBe('Ana Pérez');
    expect(teacherLabel([], bimesters, 'Luis Ríos')).toBe('Luis Ríos');
  });

  it('reemplazo: cada docente con sus bimestres', () => {
    const spans = [
      { teacherName: 'Luis Ríos', fromDate: '2026-08-03', toDate: null },
      { teacherName: 'Ana Pérez', fromDate: '2026-03-01', toDate: '2026-08-02' },
    ];
    expect(teacherLabel(spans, bimesters, 'X')).toBe('Ana Pérez (I–II) · Luis Ríos (III–IV)');
  });

  it('licencia de un bimestre: titular, suplente y titular otra vez', () => {
    const spans = [
      { teacherName: 'Ana Pérez', fromDate: '2026-03-01', toDate: '2026-05-17' },
      { teacherName: 'Luis Ríos', fromDate: '2026-05-18', toDate: '2026-07-31' },
      { teacherName: 'Ana Pérez', fromDate: '2026-08-01', toDate: null },
    ];
    expect(teacherLabel(spans, bimesters, 'X')).toBe('Ana Pérez (I) · Luis Ríos (II) · Ana Pérez (III–IV)');
  });

  it('tramos seguidos del mismo docente se unen', () => {
    const spans = [
      { teacherName: 'Lucía Flores', fromDate: '2026-03-01', toDate: '2026-11-13' },
      { teacherName: 'Lucía Flores', fromDate: '2026-11-14', toDate: null },
    ];
    expect(teacherLabel(spans, bimesters, 'X')).toBe('Lucía Flores');
  });

  it('un cambio antes de empezar clases no aparece', () => {
    const spans = [
      { teacherName: 'Ana Pérez', fromDate: '2026-01-01', toDate: '2026-02-20' },
      { teacherName: 'Luis Ríos', fromDate: '2026-02-21', toDate: null },
    ];
    expect(teacherLabel(spans, bimesters, 'X')).toBe('Luis Ríos');
  });

  it('sin fechas de periodos: con fechas', () => {
    const spans = [
      { teacherName: 'Ana Pérez', fromDate: '2026-03-01', toDate: '2026-06-14' },
      { teacherName: 'Luis Ríos', fromDate: '2026-06-15', toDate: null },
    ];
    expect(teacherLabel(spans, [], 'X')).toBe('Ana Pérez (hasta 14/06) · Luis Ríos (desde 15/06)');
  });
});

describe('validar reemplazo', () => {
  const base = { outgoingTeacherId: 'a', incomingTeacherId: 'b', kind: 'PERMANENT' as const, effectiveDate: '2026-08-03', outgoingAction: 'DEACTIVATE' as const };
  it('acepta un reemplazo definitivo', () => expect(validateReplacement(base)).toBeNull());
  it('no permite el mismo docente', () => expect(validateReplacement({ ...base, incomingTeacherId: 'a' })).toMatch(/distinto/));
  it('temporal: exige fecha de fin válida y mantener al titular', () => {
    expect(validateReplacement({ ...base, kind: 'TEMPORARY', outgoingAction: 'KEEP' })).toMatch(/hasta cuándo/);
    expect(validateReplacement({ ...base, kind: 'TEMPORARY', outgoingAction: 'KEEP', untilDate: '2026-07-01' })).toMatch(/anterior/);
    expect(validateReplacement({ ...base, kind: 'TEMPORARY', untilDate: '2026-09-30' })).toMatch(/titular/);
    expect(validateReplacement({ ...base, kind: 'TEMPORARY', outgoingAction: 'KEEP', untilDate: '2026-09-30' })).toBeNull();
  });
});
