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
