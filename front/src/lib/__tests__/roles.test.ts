import { describe, it, expect } from 'vitest';
import { DIRECTION, OFFICE, STAFF, ALL_ROLES, ROLE_LABELS, roleLabel } from '../roles';

describe('roles', () => {
  it('defines DIRECTION with SUPER_ADMIN and SCHOOL_ADMIN', () => {
    expect(DIRECTION).toEqual(['SUPER_ADMIN', 'SCHOOL_ADMIN']);
  });

  it('defines OFFICE with SUPER_ADMIN, SCHOOL_ADMIN, and ADMINISTRATIVE', () => {
    expect(OFFICE).toEqual(['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE']);
  });

  it('defines STAFF with all staff roles', () => {
    expect(STAFF).toEqual(['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER']);
  });

  it('defines ALL_ROLES including parent and student', () => {
    expect(ALL_ROLES).toEqual([
      'SUPER_ADMIN',
      'SCHOOL_ADMIN',
      'ADMINISTRATIVE',
      'TEACHER',
      'PARENT',
      'STUDENT',
    ]);
  });

  it('translates roles to human-friendly labels', () => {
    expect(roleLabel('SCHOOL_ADMIN')).toBe('Dirección');
    expect(roleLabel('TEACHER')).toBe('Docente');
    expect(roleLabel(null)).toBe('Usuario');
    expect(roleLabel(undefined)).toBe('Usuario');
    expect(ROLE_LABELS.PARENT).toBe('Apoderado');
  });
});
