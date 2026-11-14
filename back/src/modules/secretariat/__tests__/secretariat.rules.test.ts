import { describe, it, expect } from 'vitest';
import {
  addBusinessDays,
  canMoveAdmission,
  canMoveDocument,
  complaintCode,
  daysUntil,
  debtHoldApplies,
  isLikelyBot,
  isValidGrade,
} from '../secretariat.rules';

describe('admisión', () => {
  it('permite avanzar en el embudo pero no saltar a matriculado', () => {
    expect(canMoveAdmission('NEW', 'INTERVIEW')).toBe(true);
    expect(canMoveAdmission('INTERVIEW', 'ADMITTED')).toBe(true);
    expect(canMoveAdmission('NEW', 'ENROLLED')).toBe(false);
    expect(canMoveAdmission('ENROLLED', 'NEW')).toBe(false);
    expect(canMoveAdmission('REJECTED', 'INTERVIEW')).toBe(true);
  });
  it('valida grados por nivel', () => {
    expect(isValidGrade('INITIAL', 3)).toBe(true);
    expect(isValidGrade('INITIAL', 1)).toBe(false);
    expect(isValidGrade('PRIMARY', 6)).toBe(true);
    expect(isValidGrade('SECONDARY', 6)).toBe(false);
  });
});

describe('trámites', () => {
  it('flujo de estados', () => {
    expect(canMoveDocument('REQUESTED', 'READY')).toBe(true);
    expect(canMoveDocument('READY', 'DELIVERED')).toBe(true);
    expect(canMoveDocument('DELIVERED', 'REQUESTED')).toBe(false);
  });
  it('solo el certificado de estudios puede retenerse por deuda (Ley 27665)', () => {
    expect(debtHoldApplies('CERTIFICADO_ESTUDIOS', 350)).toBe(true);
    expect(debtHoldApplies('CERTIFICADO_ESTUDIOS', 0)).toBe(false);
    expect(debtHoldApplies('CONSTANCIA_ESTUDIOS', 350)).toBe(false);
    expect(debtHoldApplies('LIBRETA_NOTAS', 350)).toBe(false);
  });
});

describe('Libro de Reclamaciones', () => {
  it('correlativo', () => {
    expect(complaintCode(2026, 7)).toBe('RCL-2026-000007');
  });
  it('15 días hábiles saltando fines de semana y feriados', () => {
    // Viernes 13/11/2026 → 15 días hábiles = viernes 4/12/2026
    expect(addBusinessDays('2026-11-13', 15)).toBe('2026-12-04');
    // Lunes 28/6/2027: el martes 29 es feriado (San Pedro y San Pablo)
    expect(addBusinessDays('2027-06-28', 1)).toBe('2027-06-30');
  });
  it('días restantes', () => {
    expect(daysUntil('2026-11-13', '2026-11-20')).toBe(7);
    expect(daysUntil('2026-11-13', '2026-11-10')).toBe(-3);
  });
  it('detecta el campo trampa', () => {
    expect(isLikelyBot('')).toBe(false);
    expect(isLikelyBot(undefined)).toBe(false);
    expect(isLikelyBot('http://spam')).toBe(true);
  });
});
