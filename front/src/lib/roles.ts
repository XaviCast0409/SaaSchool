export type Role = 'SUPER_ADMIN' | 'SCHOOL_ADMIN' | 'ADMINISTRATIVE' | 'TEACHER' | 'PARENT' | 'STUDENT';

export const DIRECTION: readonly Role[] = ['SUPER_ADMIN', 'SCHOOL_ADMIN'] as const;
export const OFFICE: readonly Role[] = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE'] as const;
export const STAFF: readonly Role[] = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRATIVE', 'TEACHER'] as const;
export const ALL_ROLES: readonly Role[] = [
  'SUPER_ADMIN',
  'SCHOOL_ADMIN',
  'ADMINISTRATIVE',
  'TEACHER',
  'PARENT',
  'STUDENT',
] as const;

/** Nombre del rol tal como lo entiende el personal y las familias (nunca el código interno). */
export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Soporte KIPUX',
  SCHOOL_ADMIN: 'Dirección',
  ADMINISTRATIVE: 'Administrativo',
  TEACHER: 'Docente',
  PARENT: 'Apoderado',
  STUDENT: 'Estudiante',
};

export const roleLabel = (role?: string | null): string => (role && ROLE_LABELS[role]) || 'Usuario';
