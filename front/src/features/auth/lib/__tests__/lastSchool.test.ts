import { describe, it, expect, beforeEach } from 'vitest';
import { clearLastSchoolCode, getLastSchoolCode, isSchoolCodeFormat, normalizeSchoolCode, setLastSchoolCode } from '../lastSchool';

describe('último colegio recordado', () => {
  beforeEach(() => localStorage.clear());

  it('guarda, lee y borra el código', () => {
    expect(getLastSchoolCode()).toBeNull();
    setLastSchoolCode('innova');
    expect(getLastSchoolCode()).toBe('innova');
    clearLastSchoolCode();
    expect(getLastSchoolCode()).toBeNull();
  });

  it('normaliza y valida el formato como el backend', () => {
    expect(normalizeSchoolCode('  Innova-Academy ')).toBe('innova-academy');
    expect(isSchoolCodeFormat('innova-academy')).toBe(true);
    expect(isSchoolCodeFormat('Innova')).toBe(false);
    expect(isSchoolCodeFormat('a--b')).toBe(false);
  });
});
